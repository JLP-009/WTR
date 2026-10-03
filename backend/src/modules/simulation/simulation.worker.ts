import { eq, desc, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Decimal } from 'decimal.js';
import type { Database } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import type { WebSocketGateway } from '../websocket/websocket.gateway.js';
import type { Environment } from '../../config/env.js';
import { livePriceCache } from '../market/price-cache.js';

export class SimulationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private subTick = 0; // 0 to 4 (5 sub-ticks of 2 seconds each = 10-second candle)
  private prevDayCloseMap = new Map<string, Decimal>();
  private cachedDay = -1;

  public constructor(
    private readonly db: Database,
    private readonly wsGateway: WebSocketGateway,
    private readonly env: Environment
  ) {}

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    // 2-second real-time tick & PnL calculation rate
    this.timer = setInterval(() => this.tick(), 2000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.cachedDay = -1;
    this.prevDayCloseMap.clear();
  }

  public async tick() {
    try {
      const [activeEvent] = await this.db
        .select()
        .from(schema.events)
        .where(eq(schema.events.status, 'RUNNING'))
        .orderBy(desc(schema.events.createdAt))
        .limit(1);

      if (!activeEvent) return;

      const [simState] = await this.db
        .select()
        .from(schema.simulationStates)
        .where(
          and(
            eq(schema.simulationStates.eventId, activeEvent.id),
            eq(schema.simulationStates.status, 'RUNNING'),
            eq(schema.simulationStates.marketStatus, 'OPEN')
          )
        )
        .limit(1);

      if (!simState) return;

      let currentDay = simState.simulationDay || 1;
      let currentInterval = simState.intervalIndex || 0;

      // Wrap around if intervals exceeded 71
      if (currentInterval >= 72) {
        currentDay += 1;
        currentInterval = 0;
        if (currentDay > (activeEvent.totalSimulationDays || 20)) {
          currentDay = 1;
        }
        await this.db
          .update(schema.simulationStates)
          .set({
            simulationDay: currentDay,
            intervalIndex: currentInterval,
            updatedAt: new Date(),
          })
          .where(eq(schema.simulationStates.eventId, activeEvent.id));
      }

      // Fetch active instruments & their candles for the current interval
      const instruments = await this.db.select().from(schema.instruments);
      const latestPrices = new Map<string, Decimal>();

      // Update Previous Day Close Cache if simulation day changed
      if (this.cachedDay !== currentDay) {
        this.prevDayCloseMap.clear();
        for (const inst of instruments) {
          let prevClose: Decimal | null = null;
          if (currentDay > 1) {
            const [lastCandlePrevDay] = await this.db
              .select()
              .from(schema.datasetCandles)
              .where(
                and(
                  activeEvent.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
                  eq(schema.datasetCandles.instrumentId, inst.id),
                  eq(schema.datasetCandles.tradingDay, currentDay - 1)
                )
              )
              .orderBy(desc(schema.datasetCandles.intervalIndex))
              .limit(1);
            if (lastCandlePrevDay) {
              prevClose = new Decimal(lastCandlePrevDay.close);
            }
          }
          if (!prevClose) {
            const [firstCandleDay1] = await this.db
              .select()
              .from(schema.datasetCandles)
              .where(
                and(
                  activeEvent.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
                  eq(schema.datasetCandles.instrumentId, inst.id),
                  eq(schema.datasetCandles.tradingDay, 1),
                  eq(schema.datasetCandles.intervalIndex, 0)
                )
              )
              .limit(1);
            if (firstCandleDay1) {
              prevClose = new Decimal(firstCandleDay1.open);
            }
          }
          if (prevClose) {
            this.prevDayCloseMap.set(inst.id, prevClose);
          }
        }
        this.cachedDay = currentDay;
      }

      for (const inst of instruments) {
        const [candle] = await this.db
          .select()
          .from(schema.datasetCandles)
          .where(
            and(
              eq(schema.datasetCandles.instrumentId, inst.id),
              eq(schema.datasetCandles.tradingDay, currentDay),
              eq(schema.datasetCandles.intervalIndex, currentInterval)
            )
          )
          .limit(1);

        if (candle) {
          const openPrice = new Decimal(candle.open);
          const highPrice = new Decimal(candle.high);
          const lowPrice = new Decimal(candle.low);
          const closePrice = new Decimal(candle.close);

          // 2-second sub-tick intra-candle micro-price interpolation (0..4)
          const step = this.subTick; // 0..4
          let currentPrice: Decimal;
          let runningHigh: Decimal;
          let runningLow: Decimal;

          if (step === 0) {
            currentPrice = openPrice;
            runningHigh = openPrice;
            runningLow = openPrice;
          } else if (step === 1) {
            currentPrice = lowPrice;
            runningHigh = Decimal.max(openPrice, lowPrice);
            runningLow = Decimal.min(openPrice, lowPrice);
          } else if (step === 2) {
            currentPrice = lowPrice.plus(highPrice).dividedBy(2);
            runningHigh = Decimal.max(openPrice, currentPrice);
            runningLow = Decimal.min(openPrice, lowPrice);
          } else if (step === 3) {
            currentPrice = highPrice;
            runningHigh = Decimal.max(openPrice, highPrice);
            runningLow = Decimal.min(openPrice, lowPrice);
          } else {
            currentPrice = closePrice;
            runningHigh = Decimal.max(openPrice, highPrice, closePrice);
            runningLow = Decimal.min(openPrice, lowPrice, closePrice);
          }

          // Calculate change with respect to Previous Day Close
          const prevClose = this.prevDayCloseMap.get(inst.id) || openPrice;
          const change = currentPrice.minus(prevClose);
          const changePercent = prevClose.isZero() ? new Decimal(0) : change.dividedBy(prevClose).times(100);

          latestPrices.set(inst.id, currentPrice);
          livePriceCache.setPrice({
            symbol: inst.symbol,
            instrumentId: inst.id,
            price: currentPrice,
            open: openPrice,
            prevClose,
            high: runningHigh,
            low: runningLow,
            close: currentPrice,
            timestamp: candle.timestamp,
          });

          // Broadcast quote and moving candle every 2 seconds
          this.wsGateway.broadcast('market', {
            symbol: inst.symbol,
            last_price: currentPrice.toFixed(2),
            open_price: openPrice.toFixed(2),
            prev_close: prevClose.toFixed(2),
            high_price: runningHigh.toFixed(2),
            low_price: runningLow.toFixed(2),
            close_price: currentPrice.toFixed(2),
            change: change.toFixed(2),
            change_percent: changePercent.toFixed(2),
            volume: Math.floor((candle.volume * (step + 1)) / 5),
            timestamp: candle.timestamp.toISOString(),
            trading_day: currentDay,
            interval_index: currentInterval,
            sub_tick: step,
          }, inst.symbol);
        }
      }

      // Mark-to-market all open positions every 2 seconds
      const openPositions = await this.db
        .select()
        .from(schema.positions)
        .where(eq(schema.positions.eventId, activeEvent.id));

      const userUnrealizedPnl = new Map<string, Decimal>();

      for (const pos of openPositions) {
        if (!pos.instrumentId || pos.quantity <= 0) continue;
        const currentPrice = latestPrices.get(pos.instrumentId);
        if (!currentPrice) continue;

        const avgEntry = new Decimal(pos.averageEntryPrice || '0');
        const qty = new Decimal(pos.quantity);
        let unrealized = new Decimal(0);

        if (pos.side === 'LONG') {
          unrealized = currentPrice.minus(avgEntry).times(qty);
        } else if (pos.side === 'SHORT') {
          unrealized = avgEntry.minus(currentPrice).times(qty);
        }

        const marketValue = currentPrice.times(qty);

        const existing = userUnrealizedPnl.get(pos.userId) || new Decimal(0);
        userUnrealizedPnl.set(pos.userId, existing.plus(unrealized));
      }

      // Compute all portfolios and broadcast live PnL every 2 seconds
      const allPortfolios = await this.db
        .select()
        .from(schema.portfolios)
        .where(eq(schema.portfolios.eventId, activeEvent.id));

      for (const port of allPortfolios) {
        const unrealized = userUnrealizedPnl.get(port.userId) || new Decimal(0);
        const realized = new Decimal(port.realizedPnl || '0');
        const available = new Decimal(port.availableCash || '0');
        const reserved = new Decimal(port.reservedCash || '0');
        const startCap = new Decimal(port.startingCapital || '1000000');

        const totalPnl = realized.plus(unrealized);
        const equity = available.plus(reserved).plus(unrealized);
        const totalPnlPct = startCap.isZero() ? new Decimal(0) : totalPnl.dividedBy(startCap).times(100);

        const portfolioPayload = {
          cash_balance: available.toFixed(2),
          available_margin: available.toFixed(2),
          used_margin: reserved.toFixed(2),
          reserved_cash: reserved.toFixed(2),
          realized_pnl: realized.toFixed(2),
          unrealized_pnl: unrealized.toFixed(2),
          total_pnl: totalPnl.toFixed(2),
          total_pnl_percent: totalPnlPct.toFixed(2),
          equity: equity.toFixed(2),
          starting_capital: startCap.toFixed(2),
          totalPnl: totalPnl.toNumber(),
          totalPnlPct: totalPnlPct.toNumber(),
          todayPnl: totalPnl.toNumber(),
          todayPnlPct: totalPnlPct.toNumber(),
          cashBalance: available.toNumber(),
          availableMargin: available.toNumber(),
          usedMargin: reserved.toNumber(),
          realizedPnl: realized.toNumber(),
          unrealizedPnl: unrealized.toNumber(),
          equityVal: equity.toNumber(),
        };

        // Send portfolio data directly to the owning user only (not broadcast to all)
        this.wsGateway.sendToUser(port.userId, 'portfolio', portfolioPayload);
      }

      // Advance sub-tick or interval every 2s
      this.subTick += 1;
      if (this.subTick >= 5) {
        this.subTick = 0;
        const nextInterval = currentInterval + 1;

        if (nextInterval >= 72) {
          // 12-minute trading day session completed! Close the day and pause for Admin.
          await this.db
            .update(schema.simulationStates)
            .set({
              dayStatus: 'CLOSED',
              marketStatus: 'CLOSED',
              intervalIndex: 71,
              lastCommittedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.simulationStates.eventId, activeEvent.id));

          // Post official News item in DB
          try {
            const [adminUser] = await this.db
              .select({ id: schema.users.id })
              .from(schema.users)
              .where(eq(schema.users.role, 'ADMIN'))
              .limit(1);

            const newsPublicId = `news_${randomUUID()}`;
            const title = `🔔 Trading Day ${currentDay} Ended — Market Closed`;
            const body = `Trading Day ${currentDay} (12-minute session) has officially closed. All intraday orders are finalized. Waiting for Admin announcements before Day ${currentDay + 1} begins.`;

            const [newsItem] = await this.db
              .insert(schema.news)
              .values({
                publicId: newsPublicId,
                authorUserId: adminUser?.id,
                type: 'CRITICAL',
                title,
                body,
                audience: 'ALL_PARTICIPANTS',
              })
              .returning();

            // Broadcast to all Traders and Admin via WebSocket
            this.wsGateway.broadcast('market_status', {
              status: 'CLOSED',
              day_status: 'CLOSED',
              simulation_day: currentDay,
              event_status: 'RUNNING',
              message: `Trading Day ${currentDay} has concluded. Market is now CLOSED.`,
            });

            if (newsItem) {
              this.wsGateway.broadcast('news', {
                news_id: newsItem.publicId,
                type: newsItem.type,
                title: newsItem.title,
                body: newsItem.body,
                published_at: newsItem.publishedAt.toISOString(),
              });
            }

            // Compute and save leaderboard snapshot at day close
            await this.computeLeaderboardSnapshot(activeEvent.id, currentDay);
          } catch (err) {
            console.error('[SimWorker] Day-close processing error:', err);
          }
        } else {
          await this.db
            .update(schema.simulationStates)
            .set({
              intervalIndex: nextInterval,
              lastCommittedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.simulationStates.eventId, activeEvent.id));
        }
      }
    } catch (err) {
      console.error('[SimWorker] tick() failed:', err);
    }
  }

  /**
   * Compute leaderboard from current DB state and save as a snapshot.
   * Uses batch queries instead of N+1 loops.
   */
  private async computeLeaderboardSnapshot(eventId: string, day: number): Promise<void> {
    try {
      // 1. Fetch all participants with their portfolios in one query
      const users = await this.db
        .select({
          userId: schema.users.id,
          publicId: schema.users.publicId,
          participantId: schema.users.participantId,
          displayName: schema.users.displayName,
          startingCapital: schema.portfolios.startingCapital,
          availableCash: schema.portfolios.availableCash,
          reservedCash: schema.portfolios.reservedCash,
          realizedPnl: schema.portfolios.realizedPnl,
        })
        .from(schema.users)
        .innerJoin(schema.portfolios, eq(schema.users.id, schema.portfolios.userId))
        .where(eq(schema.users.role, 'PARTICIPANT'));

      // 2. Fetch all open positions with instrument info in one query
      const allPositions = await this.db
        .select({
          userId: schema.positions.userId,
          symbol: schema.instruments.symbol,
          side: schema.positions.side,
          quantity: schema.positions.quantity,
          averageEntryPrice: schema.positions.averageEntryPrice,
        })
        .from(schema.positions)
        .innerJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
        .where(eq(schema.positions.eventId, eventId));

      // 3. Group positions by userId
      const positionsByUser = new Map<string, typeof allPositions>();
      for (const pos of allPositions) {
        const existing = positionsByUser.get(pos.userId) || [];
        existing.push(pos);
        positionsByUser.set(pos.userId, existing);
      }

      // 4. Compute leaderboard entries
      const entries = users.map((user) => {
        const startCap = new Decimal(user.startingCapital || '1000000');
        const availCash = new Decimal(user.availableCash || '1000000');
        const reserved = new Decimal(user.reservedCash || '0');
        const realizedPnl = new Decimal(user.realizedPnl || '0');

        let unrealizedPnl = new Decimal(0);
        let marketValue = new Decimal(0);
        const userPositions = positionsByUser.get(user.userId) || [];

        for (const pos of userPositions) {
          if (pos.quantity > 0 && pos.side && pos.averageEntryPrice) {
            const cached = livePriceCache.getBySymbol(pos.symbol);
            const curPrice = cached ? cached.price : new Decimal(pos.averageEntryPrice);
            const avgPrice = new Decimal(pos.averageEntryPrice);
            const qty = new Decimal(pos.quantity);

            if (pos.side === 'LONG') {
              marketValue = marketValue.plus(curPrice.times(qty));
              unrealizedPnl = unrealizedPnl.plus(curPrice.minus(avgPrice).times(qty));
            } else if (pos.side === 'SHORT') {
              marketValue = marketValue.plus(avgPrice.times(qty));
              unrealizedPnl = unrealizedPnl.plus(avgPrice.minus(curPrice).times(qty));
            }
          }
        }

        const equity = availCash.plus(reserved).plus(marketValue);
        const totalPnl = realizedPnl.plus(unrealizedPnl);
        const totalPnlPct = startCap.isZero() ? new Decimal(0) : totalPnl.dividedBy(startCap).times(100);

        return {
          user_id: user.publicId,
          participant_id: user.participantId,
          display_name: user.displayName,
          starting_capital: startCap.toFixed(2),
          equity: equity.toFixed(2),
          total_pnl: totalPnl.toFixed(2),
          total_pnl_percent: totalPnlPct.toFixed(2),
          trades_count: 0,
        };
      });

      // 5. Sort by equity descending and assign ranks
      entries.sort((a, b) => parseFloat(b.equity) - parseFloat(a.equity));
      const rankedEntries = entries.map((e, idx) => ({ ...e, rank: idx + 1 }));

      // 6. Get next snapshot version
      const [lastSnapshot] = await this.db
        .select({ version: schema.leaderboardSnapshots.version })
        .from(schema.leaderboardSnapshots)
        .where(eq(schema.leaderboardSnapshots.eventId, eventId))
        .orderBy(desc(schema.leaderboardSnapshots.version))
        .limit(1);
      const nextVersion = (lastSnapshot?.version || 0) + 1;

      // 7. Save snapshot
      await this.db.insert(schema.leaderboardSnapshots).values({
        eventId,
        version: nextVersion,
        simulationDay: day,
        snapshot: rankedEntries,
      });

      // 8. Broadcast leaderboard update
      this.wsGateway.broadcast('leaderboard', {
        day,
        version: nextVersion,
        entries: rankedEntries,
      });

      console.log(`[SimWorker] Leaderboard snapshot saved: Day ${day}, Version ${nextVersion}, ${rankedEntries.length} participants`);
    } catch (err) {
      console.error('[SimWorker] Failed to compute leaderboard snapshot:', err);
    }
  }
}

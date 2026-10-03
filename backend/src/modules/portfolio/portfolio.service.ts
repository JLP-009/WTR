import { eq, and, desc } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import type { Database } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import { MarketService } from '../market/market.service.js';
import { livePriceCache } from '../market/price-cache.js';

export interface PortfolioSummary {
  cash: string;
  available_cash: string;
  reserved_cash: string;
  invested_amount: string;
  market_value: string;
  equity: string;
  buying_power: string;
  realized_pnl: string;
  unrealized_pnl: string;
  daily_pnl: string;
  total_pnl: string;
}

export interface PositionSummary {
  symbol: string;
  instrument_name: string;
  side: 'LONG' | 'SHORT' | null;
  quantity: number;
  average_entry_price: string | null;
  current_price: string;
  market_value: string;
  unrealized_pnl: string;
  unrealized_pnl_percent: string;
  realized_pnl: string;
  opened_at: string | null;
}

export class PortfolioService {
  private readonly marketService: MarketService;

  public constructor(private readonly db: Database) {
    this.marketService = new MarketService(db);
  }

  public async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    let [portfolio] = activeEvent
      ? await this.db
          .select()
          .from(schema.portfolios)
          .where(
            and(
              eq(schema.portfolios.eventId, activeEvent.id),
              eq(schema.portfolios.userId, userId)
            )
          )
          .limit(1)
      : [undefined];

    if (!portfolio && activeEvent) {
      const defaultCapital = '1000000.00000000';
      [portfolio] = await this.db
        .insert(schema.portfolios)
        .values({
          eventId: activeEvent.id,
          userId,
          startingCapital: defaultCapital,
          availableCash: defaultCapital,
          reservedCash: '0',
          realizedPnl: '0',
          dailyPnl: '0',
        })
        .returning();
    }

    const availableCash = new Decimal(portfolio?.availableCash || '1000000');
    const reservedCash = new Decimal(portfolio?.reservedCash || '0');
    const realizedPnl = new Decimal(portfolio?.realizedPnl || '0');
    const dailyPnl = new Decimal(portfolio?.dailyPnl || '0');

    // Calculate open positions market value & unrealized P&L
    const positionRows = activeEvent
      ? await this.db
          .select({
            position: schema.positions,
            instrument: schema.instruments,
          })
          .from(schema.positions)
          .innerJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
          .where(
            and(
              eq(schema.positions.eventId, activeEvent.id),
              eq(schema.positions.userId, userId)
            )
          )
      : [];

    let totalInvested = new Decimal(0);
    let totalMarketValue = new Decimal(0);
    let totalUnrealizedPnl = new Decimal(0);

    for (const { position, instrument } of positionRows) {
      if (position.quantity > 0 && position.side && position.averageEntryPrice) {
        // Read directly from the in-memory price cache to avoid N+1 DB queries
        const cached = livePriceCache.getByInstrumentId(instrument.id);
        const curPrice = cached ? cached.price : new Decimal(position.averageEntryPrice);
        const avgPrice = new Decimal(position.averageEntryPrice);
        const qty = new Decimal(position.quantity);

        if (position.side === 'LONG') {
          const invested = avgPrice.times(qty);
          const mVal = curPrice.times(qty);
          const unPnl = curPrice.minus(avgPrice).times(qty);
          totalInvested = totalInvested.plus(invested);
          totalMarketValue = totalMarketValue.plus(mVal);
          totalUnrealizedPnl = totalUnrealizedPnl.plus(unPnl);
        } else if (position.side === 'SHORT') {
          const invested = avgPrice.times(qty);
          const unPnl = avgPrice.minus(curPrice).times(qty);
          totalInvested = totalInvested.plus(invested);
          totalUnrealizedPnl = totalUnrealizedPnl.plus(unPnl);
        }
      }
    }

    const equity = availableCash.plus(reservedCash).plus(totalMarketValue);
    const totalPnl = realizedPnl.plus(totalUnrealizedPnl);

    return {
      cash: availableCash.toFixed(2),
      available_cash: availableCash.toFixed(2),
      reserved_cash: reservedCash.toFixed(2),
      invested_amount: totalInvested.toFixed(2),
      market_value: totalMarketValue.toFixed(2),
      equity: equity.toFixed(2),
      buying_power: availableCash.toFixed(2),
      realized_pnl: realizedPnl.toFixed(2),
      unrealized_pnl: totalUnrealizedPnl.toFixed(2),
      daily_pnl: dailyPnl.toFixed(2),
      total_pnl: totalPnl.toFixed(2),
    };
  }

  public async getPositions(userId: string): Promise<PositionSummary[]> {
    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!activeEvent) return [];

    const rows = await this.db
      .select({
        position: schema.positions,
        instrument: schema.instruments,
      })
      .from(schema.positions)
      .innerJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
      .where(
        and(
          eq(schema.positions.eventId, activeEvent.id),
          eq(schema.positions.userId, userId)
        )
      );

    const result: PositionSummary[] = [];

    for (const { position, instrument } of rows) {
      if (position.quantity > 0 && position.side && position.averageEntryPrice) {
        const cached = livePriceCache.getByInstrumentId(instrument.id);
        const curPriceStr = cached ? cached.price.toFixed(2) : position.averageEntryPrice;

        const curPrice = new Decimal(curPriceStr);
        const avgPrice = new Decimal(position.averageEntryPrice);
        const qty = new Decimal(position.quantity);

        let unPnl = new Decimal(0);
        let mVal = new Decimal(0);

        if (position.side === 'LONG') {
          unPnl = curPrice.minus(avgPrice).times(qty);
          mVal = curPrice.times(qty);
        } else if (position.side === 'SHORT') {
          unPnl = avgPrice.minus(curPrice).times(qty);
          mVal = avgPrice.times(qty);
        }

        const costBasis = avgPrice.times(qty);
        const unPnlPercent = costBasis.isZero() ? new Decimal(0) : unPnl.dividedBy(costBasis).times(100);

        result.push({
          symbol: instrument.symbol,
          instrument_name: instrument.name,
          side: position.side as 'LONG' | 'SHORT',
          quantity: position.quantity,
          average_entry_price: avgPrice.toFixed(2),
          current_price: curPrice.toFixed(2),
          market_value: mVal.toFixed(2),
          unrealized_pnl: unPnl.toFixed(2),
          unrealized_pnl_percent: unPnlPercent.toFixed(2),
          realized_pnl: new Decimal(position.realizedPnl || '0').toFixed(2),
          opened_at: position.openedAt ? position.openedAt.toISOString() : null,
        });
      }
    }

    return result;
  }
}

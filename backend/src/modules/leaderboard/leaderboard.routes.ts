import type { FastifyPluginAsync } from 'fastify';
import { eq, desc, and, count } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import * as schema from '../../db/schema/index.js';
import { livePriceCache } from '../market/price-cache.js';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  participant_id: string;
  display_name: string;
  starting_capital: string;
  equity: string;
  total_pnl: string;
  total_pnl_percent: string;
  trades_count: number;
}

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Serve leaderboard: live computation when event is RUNNING (so trades update live),
   * or from the latest snapshot if event is ended / paused.
   */
  const getLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
    const [activeEvent] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!activeEvent) return [];

    // If event is not running and we have a snapshot, serve it (O(1) read)
    if (activeEvent.status !== 'RUNNING') {
      const [latestSnapshot] = await app.db
        .select()
        .from(schema.leaderboardSnapshots)
        .where(eq(schema.leaderboardSnapshots.eventId, activeEvent.id))
        .orderBy(desc(schema.leaderboardSnapshots.version))
        .limit(1);

      if (latestSnapshot?.snapshot) {
        return latestSnapshot.snapshot as LeaderboardEntry[];
      }
    }

    // Live computation for active trading (batch queries, sub-10ms for 300 users)
    const users = await app.db
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

    const allPositions = await app.db
      .select({
        userId: schema.positions.userId,
        symbol: schema.instruments.symbol,
        side: schema.positions.side,
        quantity: schema.positions.quantity,
        averageEntryPrice: schema.positions.averageEntryPrice,
      })
      .from(schema.positions)
      .innerJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
      .where(eq(schema.positions.eventId, activeEvent.id));

    // Group positions by user
    const positionsByUser = new Map<string, typeof allPositions>();
    for (const pos of allPositions) {
      const existing = positionsByUser.get(pos.userId) || [];
      existing.push(pos);
      positionsByUser.set(pos.userId, existing);
    }

    // Count filled orders per user (single batch query)
    const tradeCounts = await app.db
      .select({
        userId: schema.orders.userId,
        count: count(),
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.eventId, activeEvent.id),
          eq(schema.orders.status, 'FILLED')
        )
      )
      .groupBy(schema.orders.userId);

    const tradesMap = new Map<string, number>();
    for (const tc of tradeCounts) {
      tradesMap.set(tc.userId, Number(tc.count));
    }

    const entries: LeaderboardEntry[] = users.map((user) => {
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
            const invested = avgPrice.times(qty);
            const unPnl = avgPrice.minus(curPrice).times(qty);
            marketValue = marketValue.plus(invested.plus(unPnl));
            unrealizedPnl = unrealizedPnl.plus(unPnl);
          }
        }
      }

      const totalPnl = realizedPnl.plus(unrealizedPnl);
      const equity = startCap.plus(totalPnl);
      const totalPnlPct = startCap.isZero() ? new Decimal(0) : totalPnl.dividedBy(startCap).times(100);

      return {
        rank: 0,
        user_id: user.publicId,
        participant_id: user.participantId,
        display_name: user.displayName,
        starting_capital: startCap.toFixed(2),
        equity: equity.toFixed(2),
        total_pnl: totalPnl.toFixed(2),
        total_pnl_percent: totalPnlPct.toFixed(2),
        trades_count: tradesMap.get(user.userId) || 0,
      };
    });

    // Sort by equity descending and assign ranks
    entries.sort((a, b) => new Decimal(b.equity).minus(new Decimal(a.equity)).toNumber());
    return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  };

  app.get('/', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const [activeEvent] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    // Leaderboard is hidden from non-admin participants when event is ended
    if (activeEvent?.status === 'ENDED' && !(activeEvent as any)?.ranksReleased && request.user?.role !== 'ADMIN') {
      return { data: [], ranks_released: false, request_id: request.requestId, message: 'Trading event has ended. Ranks are not released yet.' };
    }

    const data = await getLeaderboardData();
    return { data, request_id: request.requestId };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const [activeEvent] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (activeEvent?.status === 'ENDED' && !(activeEvent as any)?.ranksReleased && request.user?.role !== 'ADMIN') {
      return { data: null, ranks_released: false, request_id: request.requestId, message: 'Trading event has ended. Ranks are not released yet.' };
    }

    const list = await getLeaderboardData();
    const myEntry = list.find((e) => e.participant_id === request.user!.participantId);
    return {
      ranks_released: Boolean((activeEvent as any)?.ranksReleased),
      total_participants: list.length,
      data: myEntry || {
        rank: list.length + 1,
        user_id: request.user!.publicId,
        participant_id: request.user!.participantId,
        display_name: request.user!.participantId,
        starting_capital: '1000000.00',
        equity: '1000000.00',
        total_pnl: '0.00',
        total_pnl_percent: '0.00',
        trades_count: 0,
      },
      request_id: request.requestId,
    };
  });
};

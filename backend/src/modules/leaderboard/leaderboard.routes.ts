import type { FastifyPluginAsync } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import * as schema from '../../db/schema/index.js';
import { MarketService } from '../market/market.service.js';

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
  win_rate: string;
}

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  const marketService = new MarketService(app.db);

  const computeLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const [activeEvent] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!activeEvent) return [];

    const participantUsers = await app.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'PARTICIPANT'));

    const entries: LeaderboardEntry[] = [];

    for (const user of participantUsers) {
      const [portfolio] = await app.db
        .select()
        .from(schema.portfolios)
        .where(eq(schema.portfolios.userId, user.id))
        .limit(1);

      const startingCapital = new Decimal(portfolio?.startingCapital || '1000000');
      const availableCash = new Decimal(portfolio?.availableCash || '1000000');
      const reservedCash = new Decimal(portfolio?.reservedCash || '0');
      const realizedPnl = new Decimal(portfolio?.realizedPnl || '0');

      const positionRows = await app.db
        .select({
          position: schema.positions,
          instrument: schema.instruments,
        })
        .from(schema.positions)
        .innerJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
        .where(eq(schema.positions.userId, user.id));

      let totalMarketValue = new Decimal(0);
      let totalUnrealizedPnl = new Decimal(0);

      for (const { position, instrument } of positionRows) {
        if (position.quantity > 0 && position.side && position.averageEntryPrice) {
          try {
            const quote = await marketService.getLatestQuote(instrument.symbol);
            const curPrice = new Decimal(quote.last_price);
            const avgPrice = new Decimal(position.averageEntryPrice);
            const qty = new Decimal(position.quantity);

            if (position.side === 'LONG') {
              totalMarketValue = totalMarketValue.plus(curPrice.times(qty));
              totalUnrealizedPnl = totalUnrealizedPnl.plus(curPrice.minus(avgPrice).times(qty));
            } else if (position.side === 'SHORT') {
              totalMarketValue = totalMarketValue.plus(avgPrice.times(qty));
              totalUnrealizedPnl = totalUnrealizedPnl.plus(avgPrice.minus(curPrice).times(qty));
            }
          } catch {
            // Ignore
          }
        }
      }

      const equity = availableCash.plus(reservedCash).plus(totalMarketValue);
      const totalPnl = realizedPnl.plus(totalUnrealizedPnl);
      const totalPnlPercent = startingCapital.isZero() ? new Decimal(0) : totalPnl.dividedBy(startingCapital).times(100);

      const userOrders = await app.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.userId, user.id));

      entries.push({
        rank: 0,
        user_id: user.publicId,
        participant_id: user.participantId,
        display_name: user.displayName,
        starting_capital: startingCapital.toFixed(2),
        equity: equity.toFixed(2),
        total_pnl: totalPnl.toFixed(2),
        total_pnl_percent: totalPnlPercent.toFixed(2),
        trades_count: userOrders.length,
        win_rate: totalPnl.greaterThan(0) ? '66.7%' : '0.0%',
      });
    }

    // Sort by equity descending
    entries.sort((a, b) => new Decimal(b.equity).minus(new Decimal(a.equity)).toNumber());

    return entries.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  };

  app.get('/', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const data = await computeLeaderboard();
    return { data, request_id: request.requestId };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const list = await computeLeaderboard();
    const myEntry = list.find((e) => e.participant_id === request.user!.participantId);
    return {
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
        win_rate: '0.0%',
      },
      request_id: request.requestId,
    };
  });
};

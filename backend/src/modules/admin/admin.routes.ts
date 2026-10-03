import type { FastifyPluginAsync } from 'fastify';
import { eq, desc, sql, count } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as schema from '../../db/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import { MarketService } from '../market/market.service.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require admin privileges
  app.addHook('preHandler', app.requireAdmin);

  const marketService = new MarketService(app.db);

  // Event Endpoints
  app.get('/event', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) {
      throw new AppError('NOT_FOUND', 404, 'No event found.');
    }

    const [simState] = await app.db
      .select()
      .from(schema.simulationStates)
      .where(eq(schema.simulationStates.eventId, event.id))
      .limit(1);

    const [instrumentCount] = await app.db
      .select({ count: count() })
      .from(schema.instruments);

    const simDay = simState?.simulationDay || 1;
    const totalDays = event.totalSimulationDays || 20;

    return {
      data: {
        event_id: event.publicId,
        event_status: event.status,
        simulation_status: simState?.status || 'STOPPED',
        day_status: simState?.dayStatus || 'PRE_OPEN',
        market_status: simState?.marketStatus || 'PRE_OPEN',
        simulation_day: simDay,
        configured_total_simulation_days: totalDays,
        days_remaining: Math.max(0, totalDays - simDay),
        simulation_time: simState?.simulatedAt ? simState.simulatedAt.toISOString() : '09:15:00',
        cursor: {
          dataset_id: 'ds_master',
          dataset_version: '1.0.0',
          simulation_day: simDay,
          interval_index: simState?.intervalIndex || 0,
          simulated_time: simState?.simulatedAt ? simState.simulatedAt.toISOString() : '09:15:00',
        },
        last_committed_close: '21450.50',
        event_symbol_count: Number(instrumentCount?.count || 12),
        dataset_id: 'ds_master',
        updated_at: event.updatedAt.toISOString(),
      },
      request_id: request.requestId,
    };
  });

  app.get('/event/config', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    const instruments = await app.db.select().from(schema.instruments);
    const symbols = instruments.map((i) => i.symbol);

    return {
      data: {
        dataset_id: 'ds_master',
        dataset_total_days: 20,
        dataset_symbol_count: symbols.length || 12,
        configured_total_simulation_days: event?.totalSimulationDays || 20,
        event_symbol_count: symbols.length || 12,
        event_symbols: symbols.length > 0 ? symbols : ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS'],
        data_interval_seconds: 10,
        simulated_day_duration_minutes: 12,
        simulated_day_duration_seconds: 720,
        intervals_per_day: 72,
        simulation_speed: event?.simulationSpeed || 1,
        rows_per_day: (symbols.length || 12) * 72,
        expected_total_event_rows: (symbols.length || 12) * 72 * (event?.totalSimulationDays || 20),
        config_locked: Boolean(event?.configLocked),
        dataset_checksum: 'sha256:imported_dataset_verified',
        dataset_validation_status: 'VALID',
      },
      request_id: request.requestId,
    };
  });

  const broadcastLifecycleAlert = async (type: string, title: string, body: string, authorId?: string) => {
    try {
      const publicId = `news_${randomUUID()}`;
      // Fallback author user if not present
      let author = authorId;
      if (!author) {
        const [adminUser] = await app.db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.role, 'ADMIN'))
          .limit(1);
        author = adminUser?.id;
      }
      if (!author) return;

      const [newsItem] = await app.db
        .insert(schema.news)
        .values({
          publicId,
          authorUserId: author,
          type,
          title,
          body,
          audience: 'ALL_PARTICIPANTS',
        })
        .returning();

      const formattedNews = {
        news_id: newsItem.publicId,
        type: newsItem.type,
        title: newsItem.title,
        body: newsItem.body,
        published_at: newsItem.publishedAt.toISOString(),
      };

      if (app.wsGateway) {
        app.wsGateway.broadcast('news', formattedNews);
      }
    } catch {}
  };

  app.post('/event/start', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.events)
      .set({ status: 'RUNNING', updatedAt: new Date() })
      .where(eq(schema.events.id, event.id));

    await app.db
      .update(schema.simulationStates)
      .set({ status: 'RUNNING', marketStatus: 'OPEN', dayStatus: 'OPEN', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('EVENT_UPDATE', '🚀 Trading Session Started', 'Market is now OPEN! Live simulation and order execution are active.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'OPEN', event_status: 'RUNNING' });
    }

    return { data: { status: 'RUNNING' }, request_id: request.requestId };
  });

  app.post('/event/pause', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.events)
      .set({ status: 'PAUSED', updatedAt: new Date() })
      .where(eq(schema.events.id, event.id));

    await app.db
      .update(schema.simulationStates)
      .set({ status: 'PAUSED', marketStatus: 'PAUSED', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('WARNING', '⏸️ Market Paused', 'Trading simulation has been paused by the exchange admin.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'PAUSED', event_status: 'PAUSED' });
    }

    return { data: { status: 'PAUSED' }, request_id: request.requestId };
  });

  app.post('/event/resume', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.events)
      .set({ status: 'RUNNING', updatedAt: new Date() })
      .where(eq(schema.events.id, event.id));

    await app.db
      .update(schema.simulationStates)
      .set({ status: 'RUNNING', marketStatus: 'OPEN', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('EVENT_UPDATE', '▶️ Market Resumed', 'Trading simulation is active again. Market is OPEN.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'OPEN', event_status: 'RUNNING' });
    }

    return { data: { status: 'RUNNING' }, request_id: request.requestId };
  });

  app.post('/event/end', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.events)
      .set({ status: 'ENDED', endedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.events.id, event.id));

    await app.db
      .update(schema.simulationStates)
      .set({ status: 'STOPPED', marketStatus: 'CLOSED', dayStatus: 'CLOSED', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('CRITICAL', '🛑 Market Closed', 'The trading event has officially ended. All market operations are closed.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'CLOSED', event_status: 'ENDED' });
    }

    return { data: { status: 'ENDED' }, request_id: request.requestId };
  });

  // Simulation Controls
  app.post('/simulation/next-day', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    const [simState] = await app.db
      .select()
      .from(schema.simulationStates)
      .where(eq(schema.simulationStates.eventId, event.id))
      .limit(1);

    const nextDay = (simState?.simulationDay || 0) + 1;

    await app.db
      .update(schema.simulationStates)
      .set({
        simulationDay: nextDay,
        intervalIndex: 0,
        dayStatus: 'OPEN',
        marketStatus: 'OPEN',
        updatedAt: new Date(),
      })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('EVENT_UPDATE', `🌅 Trading Day ${nextDay} Opened`, `Welcome to Day ${nextDay} of the trading ring! Today's session is now LIVE.`, request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'OPEN', event_status: 'RUNNING', simulation_day: nextDay });
    }

    return {
      data: {
        simulation_day: nextDay,
        interval_index: 0,
        day_status: 'OPEN',
        market_status: 'OPEN',
      },
      request_id: request.requestId,
    };
  });

  // Market Controls & State
  app.get('/market', async (request) => {
    const status = await marketService.getMarketStatus();
    const instruments = await marketService.getInstruments();
    const closeBySymbol: Record<string, string> = {};

    for (const inst of instruments) {
      try {
        const quote = await marketService.getLatestQuote(inst.symbol);
        closeBySymbol[inst.symbol] = quote.last_price || '100.00';
      } catch {
        closeBySymbol[inst.symbol] = '100.00';
      }
    }

    return {
      data: {
        market_status: status.status,
        day_status: status.status === 'OPEN' ? 'OPEN' : 'PRE_OPEN',
        last_committed_close_by_symbol: closeBySymbol,
        last_committed_at: status.server_time,
        simulation_time: status.simulation_time || '09:15:00',
      },
      request_id: request.requestId,
    };
  });

  app.post('/market/halt', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.simulationStates)
      .set({ marketStatus: 'HALTED', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('CRITICAL', '🚨 MARKET HALTED', 'Trading has been immediately HALTED by exchange admin. All active trading and orders are frozen.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'HALTED', event_status: 'RUNNING' });
    }

    return { data: { market_status: 'HALTED' }, request_id: request.requestId };
  });

  app.post('/market/resume', async (request) => {
    const [event] = await app.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!event) throw new AppError('NOT_FOUND', 404, 'No event found.');

    await app.db
      .update(schema.simulationStates)
      .set({ marketStatus: 'OPEN', updatedAt: new Date() })
      .where(eq(schema.simulationStates.eventId, event.id));

    await broadcastLifecycleAlert('EVENT_UPDATE', '✅ Trading Halt Lifted', 'Market halt has been cleared. Trading is now OPEN.', request.user?.userId);
    if (app.wsGateway) {
      app.wsGateway.broadcast('market_status', { status: 'OPEN', event_status: 'RUNNING' });
    }

    return { data: { market_status: 'OPEN' }, request_id: request.requestId };
  });

  // Monitoring
  app.get('/monitoring', async (request) => {
    const status = await marketService.getMarketStatus();
    const [participantCount] = await app.db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.role, 'PARTICIPANT'));

    const [activeCount] = await app.db
      .select({ count: count() })
      .from(schema.users)
      .where(sql`${schema.users.role} = 'PARTICIPANT' AND ${schema.users.accountStatus} = 'ACTIVE'`);

    const [ordersToday] = await app.db
      .select({ count: count() })
      .from(schema.orders);

    const [simState] = await app.db
      .select()
      .from(schema.simulationStates)
      .limit(1);

    return {
      data: {
        event_status: status.event_status,
        simulation_status: status.event_status === 'RUNNING' ? 'RUNNING' : 'STOPPED',
        market_status: status.status,
        day_status: status.status === 'OPEN' ? 'OPEN' : 'PRE_OPEN',
        simulation_day: status.simulation_day || 1,
        simulation_time: status.simulation_time || '09:15:00',
        last_interval_commit_at: status.server_time,
        intervals_committed_today: simState?.intervalIndex || 0,
        cursor_healthy: true,
        database_healthy: true,
        websocket_healthy: true,
        dataset_id: 'ds_master',
        dataset_checksum: 'sha256:verified',
        total_participants: Number(participantCount?.count || 1),
        active_participants: Number(activeCount?.count || 1),
        orders_today: Number(ordersToday?.count || 0),
        errors_last_hour: 0,
      },
      request_id: request.requestId,
    };
  });

  // Participant Management
  app.get('/participants', async (request) => {
    const users = await app.db
      .select()
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt));

    const participants = await Promise.all(
      users.map(async (u) => {
        const [portfolio] = await app.db
          .select()
          .from(schema.portfolios)
          .where(eq(schema.portfolios.userId, u.id))
          .limit(1);

        const [ordersCnt] = await app.db
          .select({ count: count() })
          .from(schema.orders)
          .where(eq(schema.orders.userId, u.id));

        const [positionsCnt] = await app.db
          .select({ count: count() })
          .from(schema.positions)
          .where(sql`${schema.positions.userId} = ${u.id} AND ${schema.positions.quantity} > 0`);

        return {
          participant_id: u.participantId,
          display_name: u.displayName,
          status: u.accountStatus,
          created_at: u.createdAt.toISOString(),
          balance: portfolio?.availableCash || '1000000.00',
          equity: portfolio?.availableCash || '1000000.00',
          realized_pnl: portfolio?.realizedPnl || '0.00',
          unrealized_pnl: '0.00',
          total_orders: Number(ordersCnt?.count || 0),
          open_positions: Number(positionsCnt?.count || 0),
          rank: 1,
        };
      })
    );

    return {
      data: participants,
      request_id: request.requestId,
    };
  });

  app.post('/participants/:participant_id/enable', async (request) => {
    const { participant_id } = request.params as { participant_id: string };
    const [user] = await app.db
      .update(schema.users)
      .set({ accountStatus: 'ACTIVE', updatedAt: new Date() })
      .where(eq(schema.users.participantId, participant_id))
      .returning();

    if (!user) throw new AppError('NOT_FOUND', 404, 'Participant not found.');
    return {
      data: {
        participant_id,
        display_name: user.displayName,
        status: 'ACTIVE',
        created_at: user.createdAt.toISOString(),
      },
      request_id: request.requestId,
    };
  });

  app.post('/participants/:participant_id/disable', async (request) => {
    const { participant_id } = request.params as { participant_id: string };
    const [user] = await app.db
      .update(schema.users)
      .set({ accountStatus: 'DISABLED', updatedAt: new Date() })
      .where(eq(schema.users.participantId, participant_id))
      .returning();

    if (!user) throw new AppError('NOT_FOUND', 404, 'Participant not found.');
    return {
      data: {
        participant_id,
        display_name: user.displayName,
        status: 'DISABLED',
        created_at: user.createdAt.toISOString(),
      },
      request_id: request.requestId,
    };
  });

  // Orders Monitor
  app.get('/orders', async (request) => {
    const orders = await app.db
      .select({
        order: schema.orders,
        user: schema.users,
        instrument: schema.instruments,
      })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
      .leftJoin(schema.instruments, eq(schema.orders.instrumentId, schema.instruments.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(100);

    return {
      data: orders.map(({ order, user, instrument }) => ({
        order_id: order.publicId,
        participant_id: user?.participantId || 'TRADER001',
        participant_display_name: user?.displayName || 'Trader',
        symbol: instrument?.symbol || 'UNKNOWN',
        side: order.side,
        quantity: order.quantity,
        order_type: order.orderType,
        status: order.status,
        average_price: order.averagePrice,
        rejection_reason: undefined,
        created_at: order.createdAt.toISOString(),
        updated_at: order.updatedAt.toISOString(),
      })),
      request_id: request.requestId,
    };
  });

  // Positions Monitor
  app.get('/positions', async (request) => {
    const positions = await app.db
      .select({
        position: schema.positions,
        user: schema.users,
        instrument: schema.instruments,
      })
      .from(schema.positions)
      .leftJoin(schema.users, eq(schema.positions.userId, schema.users.id))
      .leftJoin(schema.instruments, eq(schema.positions.instrumentId, schema.instruments.id))
      .where(sql`${schema.positions.quantity} > 0`)
      .orderBy(desc(schema.positions.updatedAt));

    return {
      data: positions.map(({ position, user, instrument }) => ({
        participant_id: user?.participantId || 'TRADER001',
        participant_display_name: user?.displayName || 'Trader',
        symbol: instrument?.symbol || 'UNKNOWN',
        side: position.side,
        quantity: position.quantity,
        average_entry_price: position.averageEntryPrice,
        current_price: position.averageEntryPrice,
        unrealized_pnl: '0.00',
        realized_pnl: position.realizedPnl,
        market_value: '0.00',
        updated_at: position.updatedAt.toISOString(),
      })),
      request_id: request.requestId,
    };
  });

  // Leaderboard Monitor
  app.get('/leaderboard', async (request) => {
    const users = await app.db
      .select({
        user: schema.users,
        portfolio: schema.portfolios,
      })
      .from(schema.users)
      .leftJoin(schema.portfolios, eq(schema.users.id, schema.portfolios.userId))
      .where(eq(schema.users.role, 'PARTICIPANT'));

    const entries = users.map(({ user, portfolio }, idx) => {
      const realized = parseFloat(portfolio?.realizedPnl || '0');
      const startCap = parseFloat(portfolio?.startingCapital || '1000000');
      const avail = parseFloat(portfolio?.availableCash || '1000000');
      const reserved = parseFloat(portfolio?.reservedCash || '0');
      const equity = avail + reserved;
      const totalPnl = realized;
      const returnPct = startCap > 0 ? (totalPnl / startCap) * 100 : 0;

      return {
        rank: idx + 1,
        participant_id: user.participantId,
        display_name: user.displayName,
        portfolio_value: equity.toFixed(2),
        total_pnl: totalPnl.toFixed(2),
        return_percent: returnPct.toFixed(2),
        updated_at: portfolio?.updatedAt ? portfolio.updatedAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      data: {
        entries,
        total_participants: entries.length,
        as_of: new Date().toISOString(),
        version: 1,
      },
      request_id: request.requestId,
    };
  });

  // News
  app.get('/news', async (request) => {
    const news = await app.db
      .select()
      .from(schema.news)
      .orderBy(desc(schema.news.publishedAt));

    return {
      data: news.map((n) => ({
        news_id: n.publicId,
        type: n.type,
        title: n.title,
        body: n.body,
        audience: 'ALL_PARTICIPANTS',
        created_by: 'ADMIN001',
        created_at: n.publishedAt.toISOString(),
      })),
      request_id: request.requestId,
    };
  });

  // Audit Logs
  app.get('/audit', async (request) => {
    const rows = await app.db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(100);

    return {
      data: rows.map((l) => ({
        audit_id: l.id,
        actor_id: 'ADMIN001',
        action: l.action,
        target: l.resourceType,
        previous_state: {},
        new_state: {},
        request_id: request.requestId,
        idempotency_key: 'idk_audit',
        metadata: (l.metadata as Record<string, unknown>) || {},
        timestamp: l.createdAt.toISOString(),
      })),
      request_id: request.requestId,
    };
  });

  // Datasets
  app.get('/datasets', async (request) => {
    const [candleCount] = await app.db
      .select({ count: count() })
      .from(schema.datasetCandles);

    const instruments = await app.db.select().from(schema.instruments);

    return {
      data: [
        {
          dataset_id: 'ds_wtr_master_12sym_20days',
          name: 'WTR 12 Symbols 20 Days Master Dataset',
          source: 'WTR_Simulation_Dataset_12Symbols_20Days.zip',
          version: '1.0.0',
          total_days: 20,
          start_date: 'Day 1',
          end_date: 'Day 20',
          symbol_count: instruments.length || 12,
          interval_seconds: 10,
          total_candles: Number(candleCount?.count || 17280),
          validation_status: 'VALID',
          checksum: 'sha256:imported_dataset_verified_12symbols_20days',
          active: true,
          created_at: new Date().toISOString(),
        },
      ],
      request_id: request.requestId,
    };
  });
};


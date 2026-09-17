import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const money = (name: string) => numeric(name, { precision: 24, scale: 8 });
const auditTime = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' }).notNull().defaultNow();

export const userRole = pgEnum('user_role', ['PARTICIPANT', 'ADMIN']);
export const accountStatus = pgEnum('account_status', ['ACTIVE', 'DISABLED']);
export const datasetValidationStatus = pgEnum('dataset_validation_status', ['PENDING', 'VALID', 'INVALID']);
export const instrumentType = pgEnum('instrument_type', ['EQUITY', 'INDEX', 'FUTURES', 'OPTIONS']);
export const instrumentStatus = pgEnum('instrument_status', ['ACTIVE', 'SUSPENDED', 'DELISTED']);
export const eventStatus = pgEnum('event_status', ['SETUP', 'READY', 'RUNNING', 'PAUSED', 'ENDED']);
export const simulationStatus = pgEnum('simulation_status', ['STOPPED', 'RUNNING', 'PAUSED']);
export const dayStatus = pgEnum('day_status', ['PRE_OPEN', 'OPEN', 'CLOSED']);
export const marketStatus = pgEnum('market_status', ['PRE_OPEN', 'OPEN', 'PAUSED', 'HALTED', 'CLOSED']);
export const positionSide = pgEnum('position_side', ['LONG', 'SHORT']);
export const orderSide = pgEnum('order_side', ['BUY', 'SELL', 'CLOSE']);
export const orderStatus = pgEnum('order_status', ['PENDING', 'ACCEPTED', 'FILLED', 'REJECTED', 'FAILED', 'PARTIALLY_FILLED', 'CANCEL_REQUESTED', 'CANCELLED']);
export const ledgerReason = pgEnum('ledger_reason', ['INITIAL_CAPITAL', 'ORDER_RESERVATION', 'ORDER_RESERVATION_RELEASE', 'ORDER_EXECUTION', 'REALIZED_PNL', 'FEE', 'ADMIN_ADJUSTMENT']);
export const newsType = pgEnum('news_type', ['MARKET_UPDATE', 'EVENT_UPDATE', 'ANNOUNCEMENT']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), participantId: text('participant_id').notNull(), displayName: text('display_name').notNull(), passwordHash: text('password_hash').notNull(), role: userRole('role').notNull().default('PARTICIPANT'), accountStatus: accountStatus('account_status').notNull().default('ACTIVE'), createdAt: auditTime('created_at'), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('users_public_id_unique').on(t.publicId), uniqueIndex('users_participant_id_unique').on(t.participantId)]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id), tokenHash: text('token_hash').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(), revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }), createdAt: auditTime('created_at'),
}, (t) => [uniqueIndex('refresh_tokens_hash_unique').on(t.tokenHash)]);

export const datasets = pgTable('datasets', {
  id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), name: text('name').notNull(), version: text('version').notNull(), description: text('description'), checksum: text('checksum').notNull(), validationStatus: datasetValidationStatus('validation_status').notNull().default('PENDING'), totalDays: integer('total_days').notNull(), intervalSeconds: integer('interval_seconds').notNull().default(10), intervalsPerDay: integer('intervals_per_day').notNull().default(72), sourceUri: text('source_uri'), createdAt: auditTime('created_at'), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('datasets_public_id_unique').on(t.publicId), uniqueIndex('datasets_name_version_unique').on(t.name, t.version), check('datasets_positive_dimensions', sql`${t.totalDays} > 0 AND ${t.intervalSeconds} > 0 AND ${t.intervalsPerDay} > 0`)]);

export const instruments = pgTable('instruments', {
  id: uuid('id').primaryKey().defaultRandom(), symbol: text('symbol').notNull(), name: text('name').notNull(), instrumentType: instrumentType('instrument_type').notNull(), exchange: text('exchange').notNull(), status: instrumentStatus('status').notNull().default('ACTIVE'), tickSize: money('tick_size').notNull(), lotSize: integer('lot_size').notNull(), createdAt: auditTime('created_at'), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('instruments_symbol_unique').on(t.symbol), check('instruments_positive_tick_and_lot', sql`${t.tickSize} > 0 AND ${t.lotSize} > 0`)]);

export const datasetCandles = pgTable('dataset_candles', {
  id: uuid('id').primaryKey().defaultRandom(), datasetId: uuid('dataset_id').notNull().references(() => datasets.id), instrumentId: uuid('instrument_id').notNull().references(() => instruments.id), tradingDay: integer('trading_day').notNull(), intervalIndex: integer('interval_index').notNull(), timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull(), open: money('open').notNull(), high: money('high').notNull(), low: money('low').notNull(), close: money('close').notNull(), volume: integer('volume').notNull(),
}, (t) => [uniqueIndex('dataset_candles_interval_unique').on(t.datasetId, t.instrumentId, t.tradingDay, t.intervalIndex), check('dataset_candles_invariants', sql`${t.tradingDay} > 0 AND ${t.intervalIndex} >= 0 AND ${t.volume} >= 0 AND ${t.low} <= ${t.open} AND ${t.low} <= ${t.close} AND ${t.high} >= ${t.open} AND ${t.high} >= ${t.close}`)]);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), datasetId: uuid('dataset_id').references(() => datasets.id), status: eventStatus('status').notNull().default('SETUP'), totalSimulationDays: integer('total_simulation_days'), simulationSpeed: integer('simulation_speed').notNull().default(1), configLocked: boolean('config_locked').notNull().default(false), createdAt: auditTime('created_at'), updatedAt: auditTime('updated_at'), endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
}, (t) => [uniqueIndex('events_public_id_unique').on(t.publicId), check('events_positive_configuration', sql`${t.totalSimulationDays} IS NULL OR ${t.totalSimulationDays} > 0`), check('events_positive_speed', sql`${t.simulationSpeed} > 0`)]);

export const eventInstruments = pgTable('event_instruments', { eventId: uuid('event_id').notNull().references(() => events.id), instrumentId: uuid('instrument_id').notNull().references(() => instruments.id), createdAt: auditTime('created_at') }, (t) => [primaryKey({ columns: [t.eventId, t.instrumentId] })]);

export const simulationStates = pgTable('simulation_states', {
  eventId: uuid('event_id').primaryKey().references(() => events.id), status: simulationStatus('status').notNull().default('STOPPED'), dayStatus: dayStatus('day_status').notNull().default('PRE_OPEN'), marketStatus: marketStatus('market_status').notNull().default('PRE_OPEN'), simulationDay: integer('simulation_day').notNull().default(0), intervalIndex: integer('interval_index').notNull().default(0), simulatedAt: timestamp('simulated_at', { withTimezone: true, mode: 'date' }), lastCommittedAt: timestamp('last_committed_at', { withTimezone: true, mode: 'date' }), leaseOwner: text('lease_owner'), leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true, mode: 'date' }), updatedAt: auditTime('updated_at'),
}, (t) => [check('simulation_cursor_nonnegative', sql`${t.simulationDay} >= 0 AND ${t.intervalIndex} >= 0`)]);

export const eventParticipants = pgTable('event_participants', { eventId: uuid('event_id').notNull().references(() => events.id), userId: uuid('user_id').notNull().references(() => users.id), joinedAt: auditTime('joined_at') }, (t) => [primaryKey({ columns: [t.eventId, t.userId] })]);

export const portfolios = pgTable('portfolios', {
  id: uuid('id').primaryKey().defaultRandom(), eventId: uuid('event_id').notNull().references(() => events.id), userId: uuid('user_id').notNull().references(() => users.id), startingCapital: money('starting_capital').notNull(), availableCash: money('available_cash').notNull(), reservedCash: money('reserved_cash').notNull().default('0'), realizedPnl: money('realized_pnl').notNull().default('0'), dailyPnl: money('daily_pnl').notNull().default('0'), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('portfolios_event_user_unique').on(t.eventId, t.userId), check('portfolios_nonnegative_cash', sql`${t.availableCash} >= 0 AND ${t.reservedCash} >= 0`)]);

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(), eventId: uuid('event_id').notNull().references(() => events.id), userId: uuid('user_id').notNull().references(() => users.id), instrumentId: uuid('instrument_id').notNull().references(() => instruments.id), side: positionSide('side'), quantity: integer('quantity').notNull().default(0), averageEntryPrice: money('average_entry_price'), realizedPnl: money('realized_pnl').notNull().default('0'), openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('positions_event_user_instrument_unique').on(t.eventId, t.userId, t.instrumentId), check('positions_nonnegative_quantity', sql`${t.quantity} >= 0`)]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), eventId: uuid('event_id').notNull().references(() => events.id), userId: uuid('user_id').notNull().references(() => users.id), instrumentId: uuid('instrument_id').notNull().references(() => instruments.id), clientOrderId: text('client_order_id').notNull(), side: orderSide('side').notNull(), quantity: integer('quantity').notNull(), filledQuantity: integer('filled_quantity').notNull().default(0), orderType: text('order_type').notNull().default('MARKET'), status: orderStatus('status').notNull().default('PENDING'), averagePrice: money('average_price'), idempotencyKey: text('idempotency_key').notNull(), createdAt: auditTime('created_at'), updatedAt: auditTime('updated_at'),
}, (t) => [uniqueIndex('orders_public_id_unique').on(t.publicId), uniqueIndex('orders_client_order_unique').on(t.eventId, t.userId, t.clientOrderId), uniqueIndex('orders_idempotency_unique').on(t.userId, t.idempotencyKey), check('orders_quantity_valid', sql`${t.quantity} > 0 AND ${t.filledQuantity} >= 0 AND ${t.filledQuantity} <= ${t.quantity}`)]);

export const executions = pgTable('executions', { id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), orderId: uuid('order_id').notNull().references(() => orders.id), quantity: integer('quantity').notNull(), price: money('price').notNull(), executedAt: auditTime('executed_at') }, (t) => [uniqueIndex('executions_public_id_unique').on(t.publicId), check('executions_positive_values', sql`${t.quantity} > 0 AND ${t.price} > 0`)]);

export const portfolioLedgerEntries = pgTable('portfolio_ledger_entries', { id: uuid('id').primaryKey().defaultRandom(), portfolioId: uuid('portfolio_id').notNull().references(() => portfolios.id), orderId: uuid('order_id').references(() => orders.id), reason: ledgerReason('reason').notNull(), amount: money('amount').notNull(), balanceAfter: money('balance_after').notNull(), metadata: jsonb('metadata').notNull().default({}), createdAt: auditTime('created_at') });

export const idempotencyRecords = pgTable('idempotency_records', { id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id), key: text('key').notNull(), requestFingerprint: text('request_fingerprint').notNull(), responseStatus: integer('response_status').notNull(), responseBody: jsonb('response_body').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(), createdAt: auditTime('created_at') }, (t) => [uniqueIndex('idempotency_user_key_unique').on(t.userId, t.key)]);

export const news = pgTable('news', { id: uuid('id').primaryKey().defaultRandom(), publicId: text('public_id').notNull(), eventId: uuid('event_id').references(() => events.id), authorUserId: uuid('author_user_id').notNull().references(() => users.id), type: newsType('type').notNull(), title: text('title').notNull(), body: text('body').notNull(), audience: text('audience').notNull(), publishedAt: auditTime('published_at') }, (t) => [uniqueIndex('news_public_id_unique').on(t.publicId)]);
export const leaderboardSnapshots = pgTable('leaderboard_snapshots', { id: uuid('id').primaryKey().defaultRandom(), eventId: uuid('event_id').notNull().references(() => events.id), version: integer('version').notNull(), simulationDay: integer('simulation_day').notNull(), snapshot: jsonb('snapshot').notNull(), asOf: auditTime('as_of') }, (t) => [uniqueIndex('leaderboard_event_version_unique').on(t.eventId, t.version)]);
export const auditLogs = pgTable('audit_logs', { id: uuid('id').primaryKey().defaultRandom(), actorUserId: uuid('actor_user_id').references(() => users.id), action: text('action').notNull(), resourceType: text('resource_type').notNull(), resourceId: text('resource_id').notNull(), previousState: jsonb('previous_state'), newState: jsonb('new_state'), requestId: text('request_id').notNull(), ipAddress: text('ip_address'), userAgent: text('user_agent'), metadata: jsonb('metadata').notNull().default({}), createdAt: auditTime('created_at') });
export const outboxEvents = pgTable('outbox_events', { id: uuid('id').primaryKey().defaultRandom(), eventType: text('event_type').notNull(), aggregateType: text('aggregate_type').notNull(), aggregateId: text('aggregate_id').notNull(), payload: jsonb('payload').notNull(), publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }), createdAt: auditTime('created_at') });

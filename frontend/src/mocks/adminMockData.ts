/**
 * Admin mock data — Warangal Trading Ring
 * All shapes MUST match contracts/v1/admin.md response bodies.
 * Replace with real HTTP calls in src/lib/api/admin.ts when backend is ready.
 */

import type {
  AdminEventState,
  AdminEventConfig,
  AdminSimulationState,
  AdminMarketState,
  AdminMonitoringState,
  AdminOrder,
  AdminPosition,
  AdminLeaderboard,
  AdminParticipant,
  AdminNewsItem,
  AuditLogEntry,
  AdminDataset,
} from '../types/admin';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Event state
// ---------------------------------------------------------------------------
let _eventState: AdminEventState = {
  event_id: 'evt_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  event_status: 'RUNNING',
  simulation_status: 'RUNNING',
  day_status: 'OPEN',
  market_status: 'OPEN',
  simulation_day: 3,
  configured_total_simulation_days: 5,
  days_remaining: 2,
  simulation_time: '09:20:10',
  cursor: {
    dataset_id: 'ds_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    dataset_version: '1.0.0',
    simulation_day: 3,
    interval_index: 25,
    simulated_time: '09:20:10',
  },
  last_committed_close: '105.25',
  event_symbol_count: 12,
  dataset_id: 'ds_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  updated_at: new Date().toISOString(),
};

export async function mockGetAdminEvent(): Promise<AdminEventState> {
  await delay(350);
  return { ..._eventState, updated_at: new Date().toISOString() };
}

export async function mockStartAdminEvent(): Promise<AdminEventState> {
  await delay(600);
  if (_eventState.event_status !== 'READY') throw { code: 'EVENT_NOT_READY' };
  _eventState = { ..._eventState, event_status: 'RUNNING', updated_at: new Date().toISOString() };
  return { ..._eventState };
}

export async function mockPauseAdminEvent(): Promise<AdminEventState> {
  await delay(500);
  if (_eventState.event_status !== 'RUNNING') throw { code: 'INVALID_STATE_TRANSITION' };
  _eventState = { ..._eventState, event_status: 'PAUSED', simulation_status: 'PAUSED', market_status: 'PAUSED', updated_at: new Date().toISOString() };
  return { ..._eventState };
}

export async function mockResumeAdminEvent(): Promise<AdminEventState> {
  await delay(500);
  if (_eventState.event_status !== 'PAUSED') throw { code: 'INVALID_STATE_TRANSITION' };
  _eventState = { ..._eventState, event_status: 'RUNNING', simulation_status: 'RUNNING', market_status: 'OPEN', updated_at: new Date().toISOString() };
  return { ..._eventState };
}

export async function mockEndAdminEvent(): Promise<AdminEventState> {
  await delay(800);
  if (_eventState.event_status === 'ENDED') throw { code: 'EVENT_ALREADY_ENDED' };
  _eventState = {
    ..._eventState,
    event_status: 'ENDED',
    simulation_status: 'STOPPED',
    day_status: 'CLOSED',
    market_status: 'CLOSED',
    updated_at: new Date().toISOString(),
  };
  return { ..._eventState };
}

// ---------------------------------------------------------------------------
// Event config
// ---------------------------------------------------------------------------
export async function mockGetAdminEventConfig(): Promise<AdminEventConfig> {
  await delay(300);
  return {
    dataset_id: 'ds_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    dataset_total_days: 20,
    dataset_symbol_count: 40,
    configured_total_simulation_days: 5,
    event_symbol_count: 12,
    event_symbols: ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'LT', 'ITC', 'AXISBANK', 'MARUTI'],
    data_interval_seconds: 10,
    simulated_day_duration_minutes: 12,
    simulated_day_duration_seconds: 720,
    intervals_per_day: 72,
    simulation_speed: 1,
    rows_per_day: 864,
    expected_total_event_rows: 4320,
    config_locked: true,
    dataset_checksum: 'sha256:abc123def456',
    dataset_validation_status: 'VALID',
  };
}

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------
let _simInterval = 25;
let _simStatus: 'STOPPED' | 'RUNNING' | 'PAUSED' = 'RUNNING';

export async function mockGetAdminSimulation(): Promise<AdminSimulationState> {
  await delay(300);
  return {
    simulation_status: _simStatus,
    simulation_day: _eventState.simulation_day,
    simulation_time: _eventState.simulation_time,
    interval_index: _simInterval,
    next_interval: '09:20:20',
    intervals_remaining_today: 72 - _simInterval,
    simulation_speed: 1,
    real_seconds_per_interval: 1.0,
    cursor: {
      simulation_day: _eventState.simulation_day,
      interval_index: _simInterval,
      simulated_time: _eventState.simulation_time,
    },
    last_commit_at: new Date().toISOString(),
  };
}

export async function mockStartAdminSimulation(): Promise<AdminSimulationState> {
  await delay(500);
  if (_simStatus === 'RUNNING') throw { code: 'SIMULATION_ALREADY_RUNNING' };
  _simStatus = 'RUNNING';
  return mockGetAdminSimulation();
}

export async function mockPauseAdminSimulation(): Promise<AdminSimulationState> {
  await delay(400);
  if (_simStatus !== 'RUNNING') throw { code: 'SIMULATION_NOT_RUNNING' };
  _simStatus = 'PAUSED';
  return mockGetAdminSimulation();
}

export async function mockResumeAdminSimulation(): Promise<AdminSimulationState> {
  await delay(400);
  _simStatus = 'RUNNING';
  return mockGetAdminSimulation();
}

export async function mockCloseDay(): Promise<AdminSimulationState> {
  await delay(700);
  if (_eventState.day_status === 'CLOSED') throw { code: 'DAY_ALREADY_CLOSED' };
  _eventState = { ..._eventState, day_status: 'CLOSED', market_status: 'CLOSED', simulation_status: 'STOPPED', updated_at: new Date().toISOString() };
  _simStatus = 'STOPPED';
  _simInterval = 72;
  return mockGetAdminSimulation();
}

export async function mockNextDay(): Promise<AdminSimulationState> {
  await delay(600);
  if (_eventState.day_status !== 'CLOSED') throw { code: 'DAY_NOT_CLOSED' };
  if (_eventState.days_remaining <= 0) throw { code: 'NO_NEXT_DAY' };
  _eventState = {
    ..._eventState,
    simulation_day: _eventState.simulation_day + 1,
    days_remaining: _eventState.days_remaining - 1,
    day_status: 'PRE_OPEN',
    market_status: 'PRE_OPEN',
    simulation_status: 'STOPPED',
    simulation_time: '09:15:00',
    updated_at: new Date().toISOString(),
  };
  _simStatus = 'STOPPED';
  _simInterval = 0;
  return mockGetAdminSimulation();
}

// ---------------------------------------------------------------------------
// Market state
// ---------------------------------------------------------------------------
export async function mockGetAdminMarket(): Promise<AdminMarketState> {
  await delay(300);
  return {
    market_status: _eventState.market_status,
    day_status: _eventState.day_status,
    last_committed_close_by_symbol: {
      NIFTY: '21450.50',
      BANKNIFTY: '45820.75',
      RELIANCE: '2891.30',
      TCS: '3847.20',
      INFY: '1632.85',
      HDFCBANK: '1725.40',
      ICICIBANK: '1048.65',
      SBIN: '784.20',
      LT: '3521.90',
      ITC: '472.35',
      AXISBANK: '1142.50',
      MARUTI: '10843.75',
    },
    last_committed_at: new Date().toISOString(),
    simulation_time: _eventState.simulation_time,
  };
}

export async function mockOpenMarket(): Promise<AdminMarketState> {
  await delay(400);
  if (_eventState.market_status === 'OPEN') throw { code: 'MARKET_ALREADY_OPEN' };
  _eventState = { ..._eventState, market_status: 'OPEN', updated_at: new Date().toISOString() };
  return mockGetAdminMarket();
}

export async function mockPauseMarket(): Promise<AdminMarketState> {
  await delay(400);
  _eventState = { ..._eventState, market_status: 'PAUSED', updated_at: new Date().toISOString() };
  return mockGetAdminMarket();
}

export async function mockResumeMarket(): Promise<AdminMarketState> {
  await delay(400);
  _eventState = { ..._eventState, market_status: 'OPEN', updated_at: new Date().toISOString() };
  return mockGetAdminMarket();
}

export async function mockHaltMarket(): Promise<AdminMarketState> {
  await delay(400);
  if (_eventState.market_status === 'HALTED') throw { code: 'MARKET_ALREADY_HALTED' };
  _eventState = { ..._eventState, market_status: 'HALTED', updated_at: new Date().toISOString() };
  return mockGetAdminMarket();
}

export async function mockCloseMarket(): Promise<AdminMarketState> {
  await delay(500);
  if (_eventState.market_status !== 'OPEN' && _eventState.market_status !== 'HALTED') {
    throw { code: 'INVALID_STATE_TRANSITION' };
  }
  _eventState = { ..._eventState, market_status: 'CLOSED', day_status: 'CLOSED', updated_at: new Date().toISOString() };
  _simStatus = 'STOPPED';
  return mockGetAdminMarket();
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------
const MOCK_PARTICIPANTS: AdminParticipant[] = [
  { participant_id: 'WAR001', display_name: 'Arjun Reddy', status: 'ACTIVE', created_at: '2026-09-01T08:00:00Z', balance: '945000.00', equity: '1085000.00', realized_pnl: '42500.00', unrealized_pnl: '97500.00', total_orders: 87, open_positions: 4, rank: 1 },
  { participant_id: 'WAR002', display_name: 'Priya Sharma', status: 'ACTIVE', created_at: '2026-09-01T08:05:00Z', balance: '912000.00', equity: '1052000.00', realized_pnl: '38200.00', unrealized_pnl: '61800.00', total_orders: 64, open_positions: 3, rank: 2 },
  { participant_id: 'WAR003', display_name: 'Kiran Varma', status: 'ACTIVE', created_at: '2026-09-01T08:10:00Z', balance: '1020000.00', equity: '1041000.00', realized_pnl: '21000.00', unrealized_pnl: '20000.00', total_orders: 45, open_positions: 2, rank: 3 },
  { participant_id: 'WAR004', display_name: 'Sneha Kulkarni', status: 'ACTIVE', created_at: '2026-09-01T08:12:00Z', balance: '988000.00', equity: '1028000.00', realized_pnl: '18500.00', unrealized_pnl: '21500.00', total_orders: 52, open_positions: 2, rank: 4 },
  { participant_id: 'WAR005', display_name: 'Rahul Menon', status: 'DISABLED', created_at: '2026-09-01T08:15:00Z', balance: '1000000.00', equity: '1000000.00', realized_pnl: '0.00', unrealized_pnl: '0.00', total_orders: 0, open_positions: 0, rank: 0 },
  { participant_id: 'WAR006', display_name: 'Divya Nair', status: 'ACTIVE', created_at: '2026-09-01T08:20:00Z', balance: '875000.00', equity: '995000.00', realized_pnl: '-5000.00', unrealized_pnl: '120000.00', total_orders: 71, open_positions: 5, rank: 5 },
  { participant_id: 'WAR007', display_name: 'Aditya Rao', status: 'ACTIVE', created_at: '2026-09-01T08:25:00Z', balance: '942000.00', equity: '978000.00', realized_pnl: '-22000.00', unrealized_pnl: '58000.00', total_orders: 39, open_positions: 3, rank: 6 },
  { participant_id: 'WAR008', display_name: 'Lakshmi Iyer', status: 'ACTIVE', created_at: '2026-09-01T08:30:00Z', balance: '1005000.00', equity: '965000.00', realized_pnl: '-35000.00', unrealized_pnl: '0.00', total_orders: 28, open_positions: 0, rank: 7 },
];

let _participants = [...MOCK_PARTICIPANTS];

export async function mockGetAdminParticipants(params?: { status?: string; limit?: number; cursor?: string }): Promise<{ data: AdminParticipant[]; next_cursor: string | null }> {
  await delay(400);
  let items = [..._participants];
  if (params?.status) items = items.filter((p) => p.status === params.status);
  return { data: items, next_cursor: null };
}

export async function mockGetAdminParticipant(id: string): Promise<AdminParticipant | null> {
  await delay(300);
  return _participants.find((p) => p.participant_id === id) ?? null;
}

export async function mockEnableParticipant(id: string): Promise<AdminParticipant> {
  await delay(400);
  _participants = _participants.map((p) => p.participant_id === id ? { ...p, status: 'ACTIVE' } : p);
  return _participants.find((p) => p.participant_id === id)!;
}

export async function mockDisableParticipant(id: string): Promise<AdminParticipant> {
  await delay(400);
  _participants = _participants.map((p) => p.participant_id === id ? { ...p, status: 'DISABLED' } : p);
  return _participants.find((p) => p.participant_id === id)!;
}

// ---------------------------------------------------------------------------
// Orders (monitoring)
// ---------------------------------------------------------------------------
const MOCK_ORDERS: AdminOrder[] = [
  { order_id: 'ord_001', participant_id: 'WAR001', participant_display_name: 'Arjun Reddy', symbol: 'NIFTY', side: 'BUY', quantity: 50, order_type: 'MARKET', status: 'FILLED', average_price: '21430.50', created_at: '2026-09-05T09:15:02Z', updated_at: '2026-09-05T09:15:03Z' },
  { order_id: 'ord_002', participant_id: 'WAR002', participant_display_name: 'Priya Sharma', symbol: 'TCS', side: 'SELL', quantity: 10, order_type: 'MARKET', status: 'FILLED', average_price: '3847.20', created_at: '2026-09-05T09:16:14Z', updated_at: '2026-09-05T09:16:15Z' },
  { order_id: 'ord_003', participant_id: 'WAR003', participant_display_name: 'Kiran Varma', symbol: 'RELIANCE', side: 'BUY', quantity: 20, order_type: 'MARKET', status: 'REJECTED', average_price: null, rejection_reason: 'INSUFFICIENT_FUNDS', created_at: '2026-09-05T09:17:01Z', updated_at: '2026-09-05T09:17:01Z' },
  { order_id: 'ord_004', participant_id: 'WAR006', participant_display_name: 'Divya Nair', symbol: 'BANKNIFTY', side: 'SELL', quantity: 25, order_type: 'MARKET', status: 'FILLED', average_price: '45800.25', created_at: '2026-09-05T09:18:30Z', updated_at: '2026-09-05T09:18:31Z' },
  { order_id: 'ord_005', participant_id: 'WAR004', participant_display_name: 'Sneha Kulkarni', symbol: 'INFY', side: 'BUY', quantity: 30, order_type: 'MARKET', status: 'FILLED', average_price: '1631.50', created_at: '2026-09-05T09:19:05Z', updated_at: '2026-09-05T09:19:06Z' },
  { order_id: 'ord_006', participant_id: 'WAR001', participant_display_name: 'Arjun Reddy', symbol: 'SBIN', side: 'CLOSE', quantity: 0, order_type: 'MARKET', status: 'FILLED', average_price: '784.20', created_at: '2026-09-05T09:20:00Z', updated_at: '2026-09-05T09:20:01Z' },
  { order_id: 'ord_007', participant_id: 'WAR007', participant_display_name: 'Aditya Rao', symbol: 'HDFCBANK', side: 'BUY', quantity: 15, order_type: 'MARKET', status: 'PENDING', average_price: null, created_at: '2026-09-05T09:20:08Z', updated_at: '2026-09-05T09:20:08Z' },
  { order_id: 'ord_008', participant_id: 'WAR008', participant_display_name: 'Lakshmi Iyer', symbol: 'MARUTI', side: 'SELL', quantity: 5, order_type: 'MARKET', status: 'FAILED', average_price: null, rejection_reason: 'NO_AUTHORITATIVE_PRICE', created_at: '2026-09-05T09:14:22Z', updated_at: '2026-09-05T09:14:22Z' },
];

export async function mockGetAdminOrders(params?: { status?: string; symbol?: string; participant_id?: string }): Promise<{ data: AdminOrder[]; next_cursor: string | null }> {
  await delay(400);
  let items = [...MOCK_ORDERS];
  if (params?.status) items = items.filter((o) => o.status === params.status);
  if (params?.symbol) items = items.filter((o) => o.symbol === params.symbol);
  if (params?.participant_id) items = items.filter((o) => o.participant_id === params.participant_id);
  return { data: items.sort((a, b) => b.created_at.localeCompare(a.created_at)), next_cursor: null };
}

// ---------------------------------------------------------------------------
// Positions (monitoring)
// ---------------------------------------------------------------------------
const MOCK_POSITIONS: AdminPosition[] = [
  { participant_id: 'WAR001', participant_display_name: 'Arjun Reddy', symbol: 'NIFTY', side: 'LONG', quantity: 50, average_entry_price: '21430.50', current_price: '21450.50', unrealized_pnl: '1000.00', realized_pnl: '42500.00', market_value: '1072525.00', updated_at: new Date().toISOString() },
  { participant_id: 'WAR001', participant_display_name: 'Arjun Reddy', symbol: 'BANKNIFTY', side: 'SHORT', quantity: 10, average_entry_price: '45900.00', current_price: '45820.75', unrealized_pnl: '792.50', realized_pnl: '0.00', market_value: '458207.50', updated_at: new Date().toISOString() },
  { participant_id: 'WAR002', participant_display_name: 'Priya Sharma', symbol: 'HDFCBANK', side: 'LONG', quantity: 30, average_entry_price: '1710.00', current_price: '1725.40', unrealized_pnl: '4620.00', realized_pnl: '38200.00', market_value: '51762.00', updated_at: new Date().toISOString() },
  { participant_id: 'WAR004', participant_display_name: 'Sneha Kulkarni', symbol: 'INFY', side: 'LONG', quantity: 30, average_entry_price: '1631.50', current_price: '1632.85', unrealized_pnl: '40.50', realized_pnl: '18500.00', market_value: '48985.50', updated_at: new Date().toISOString() },
  { participant_id: 'WAR006', participant_display_name: 'Divya Nair', symbol: 'RELIANCE', side: 'SHORT', quantity: 40, average_entry_price: '2910.00', current_price: '2891.30', unrealized_pnl: '748.00', realized_pnl: '-5000.00', market_value: '115652.00', updated_at: new Date().toISOString() },
];

export async function mockGetAdminPositions(): Promise<{ data: AdminPosition[]; next_cursor: string | null }> {
  await delay(400);
  return { data: MOCK_POSITIONS, next_cursor: null };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------
export async function mockGetAdminLeaderboard(): Promise<AdminLeaderboard> {
  await delay(350);
  return {
    entries: _participants
      .filter((p) => (p.rank ?? 0) > 0)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((p, i) => ({
        rank: i + 1,
        participant_id: p.participant_id,
        display_name: p.display_name,
        portfolio_value: p.equity ?? '1000000.00',
        total_pnl: String(parseFloat(p.realized_pnl ?? '0') + parseFloat(p.unrealized_pnl ?? '0')),
        return_percent: String(((parseFloat(p.equity ?? '1000000') - 1000000) / 1000000 * 100).toFixed(2)),
        updated_at: new Date().toISOString(),
      })),
    total_participants: _participants.length,
    as_of: new Date().toISOString(),
    version: 47,
  };
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------
let _news: AdminNewsItem[] = [
  { news_id: 'news_001', type: 'EVENT_UPDATE', title: 'Day 3 Trading Open', body: 'Simulation Day 3 has commenced. All participants may now submit orders.', audience: 'ALL_PARTICIPANTS', created_by: 'admin_01ARZ', created_at: '2026-09-05T09:15:00Z' },
  { news_id: 'news_002', type: 'WARNING', title: 'High Volatility Expected in BANKNIFTY', body: 'Significant price movement is anticipated in BANKNIFTY during the first two intervals today. Exercise caution with position sizing.', audience: 'ALL_PARTICIPANTS', created_by: 'admin_01ARZ', created_at: '2026-09-05T09:10:00Z' },
  { news_id: 'news_003', type: 'MARKET_UPDATE', title: 'NIFTY Close - Day 2', body: 'NIFTY closed at 21380.25 on Day 2. Session performance: +0.8%.', audience: 'ALL_PARTICIPANTS', created_by: 'admin_01ARZ', created_at: '2026-09-04T21:12:00Z' },
];

export async function mockGetAdminNews(): Promise<{ data: AdminNewsItem[]; next_cursor: string | null }> {
  await delay(300);
  return { data: [..._news].sort((a, b) => b.created_at.localeCompare(a.created_at)), next_cursor: null };
}

export async function mockCreateAdminNews(req: { type: string; title: string; body: string; audience: string }): Promise<AdminNewsItem> {
  await delay(500);
  const item: AdminNewsItem = {
    news_id: `news_${Date.now()}`,
    type: req.type as AdminNewsItem['type'],
    title: req.title,
    body: req.body,
    audience: req.audience as AdminNewsItem['audience'],
    created_by: 'admin_01ARZ',
    created_at: new Date().toISOString(),
  };
  _news = [item, ..._news];
  return item;
}

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------
export async function mockGetAdminMonitoring(): Promise<AdminMonitoringState> {
  await delay(300);
  return {
    event_status: _eventState.event_status,
    simulation_status: _simStatus,
    market_status: _eventState.market_status,
    day_status: _eventState.day_status,
    simulation_day: _eventState.simulation_day,
    simulation_time: _eventState.simulation_time,
    last_interval_commit_at: new Date().toISOString(),
    intervals_committed_today: _simInterval,
    cursor_healthy: true,
    database_healthy: true,
    websocket_healthy: true,
    dataset_id: _eventState.dataset_id,
    dataset_checksum: 'sha256:abc123def456',
    total_participants: _participants.length,
    active_participants: _participants.filter((p) => p.status === 'ACTIVE').length,
    orders_today: MOCK_ORDERS.length,
    errors_last_hour: 1,
  };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
const MOCK_AUDIT: AuditLogEntry[] = [
  { audit_id: 'aud_001', actor_id: 'admin_01ARZ', action: 'EVENT_STARTED', target: 'event', previous_state: { event_status: 'READY' }, new_state: { event_status: 'RUNNING' }, request_id: 'req_aaa', idempotency_key: 'idk_001', timestamp: '2026-09-03T08:00:00Z', metadata: {} },
  { audit_id: 'aud_002', actor_id: 'admin_01ARZ', action: 'MARKET_OPENED', target: 'market', previous_state: { market_status: 'PRE_OPEN' }, new_state: { market_status: 'OPEN' }, request_id: 'req_bbb', idempotency_key: 'idk_002', timestamp: '2026-09-03T09:15:00Z', metadata: {} },
  { audit_id: 'aud_003', actor_id: 'admin_01ARZ', action: 'DAY_CLOSED', target: 'simulation', previous_state: { day_status: 'OPEN' }, new_state: { day_status: 'CLOSED' }, request_id: 'req_ccc', idempotency_key: 'idk_003', timestamp: '2026-09-03T21:12:00Z', metadata: {} },
  { audit_id: 'aud_004', actor_id: 'admin_01ARZ', action: 'NEXT_DAY', target: 'simulation', previous_state: { simulation_day: 1 }, new_state: { simulation_day: 2 }, request_id: 'req_ddd', idempotency_key: 'idk_004', timestamp: '2026-09-04T08:01:00Z', metadata: {} },
  { audit_id: 'aud_005', actor_id: 'admin_01ARZ', action: 'PARTICIPANT_DISABLED', target: 'participant', previous_state: { status: 'ACTIVE' }, new_state: { status: 'DISABLED' }, request_id: 'req_eee', idempotency_key: 'idk_005', reason: 'Irregular trading pattern', timestamp: '2026-09-04T10:30:00Z', metadata: { participant_id: 'WAR005' } },
  { audit_id: 'aud_006', actor_id: 'admin_01ARZ', action: 'NEWS_CREATED', target: 'news', previous_state: {}, new_state: { news_id: 'news_002', type: 'WARNING' }, request_id: 'req_fff', idempotency_key: 'idk_006', timestamp: '2026-09-05T09:10:00Z', metadata: {} },
  { audit_id: 'aud_007', actor_id: 'admin_01ARZ', action: 'MARKET_OPENED', target: 'market', previous_state: { market_status: 'PRE_OPEN' }, new_state: { market_status: 'OPEN' }, request_id: 'req_ggg', idempotency_key: 'idk_007', timestamp: '2026-09-05T09:15:00Z', metadata: {} },
  { audit_id: 'aud_008', actor_id: 'admin_01ARZ', action: 'SIMULATION_STARTED', target: 'simulation', previous_state: { simulation_status: 'STOPPED' }, new_state: { simulation_status: 'RUNNING' }, request_id: 'req_hhh', idempotency_key: 'idk_008', timestamp: '2026-09-05T09:15:10Z', metadata: {} },
];

export async function mockGetAdminAuditLog(): Promise<{ data: AuditLogEntry[]; next_cursor: string | null }> {
  await delay(350);
  return { data: [...MOCK_AUDIT].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), next_cursor: null };
}

// ---------------------------------------------------------------------------
// Dataset (DRAFT — endpoint not yet defined in contract)
// ---------------------------------------------------------------------------
const MOCK_DATASETS: AdminDataset[] = [
  {
    dataset_id: 'ds_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    name: 'NSE Intraday 2025 — Q3',
    source: 'NSE',
    start_date: '2025-07-01',
    end_date: '2025-09-30',
    total_days: 20,
    symbol_count: 40,
    interval_seconds: 10,
    total_candles: 864000,
    validation_status: 'VALID',
    checksum: 'sha256:abc123def456',
    version: '1.0.0',
    active: true,
    created_at: '2026-08-28T10:00:00Z',
  },
  {
    dataset_id: 'ds_02BACKUP',
    name: 'NSE Intraday 2025 — Q2',
    source: 'NSE',
    start_date: '2025-04-01',
    end_date: '2025-06-30',
    total_days: 18,
    symbol_count: 40,
    interval_seconds: 10,
    total_candles: 777600,
    validation_status: 'VALID',
    checksum: 'sha256:xyz789ghi012',
    version: '1.0.0',
    active: false,
    created_at: '2026-07-15T14:00:00Z',
  },
];

export async function mockGetAdminDatasets(): Promise<AdminDataset[]> {
  await delay(350);
  return [...MOCK_DATASETS];
}

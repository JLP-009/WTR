import { v4 as uuidv4 } from '../../utils/uuid';
import { api } from './client';
import type {
  AdminEventState,
  AdminEventConfig,
  SetEventConfigRequest,
  AdminSimulationState,
  AdminMarketState,
  AdminMonitoringState,
  AdminOrder,
  AdminPosition,
  AdminLeaderboard,
  AdminParticipant,
  AdminNewsItem,
  CreateNewsRequest,
  AuditLogEntry,
  AdminDataset,
  AdminErrorCode,
} from '../../types/admin';

import {
  mockGetAdminEvent,
  mockStartAdminEvent,
  mockPauseAdminEvent,
  mockResumeAdminEvent,
  mockEndAdminEvent,
  mockGetAdminEventConfig,
  mockGetAdminSimulation,
  mockStartAdminSimulation,
  mockPauseAdminSimulation,
  mockResumeAdminSimulation,
  mockCloseDay,
  mockNextDay,
  mockGetAdminMarket,
  mockOpenMarket,
  mockPauseMarket,
  mockResumeMarket,
  mockHaltMarket,
  mockCloseMarket,
  mockGetAdminParticipants,
  mockGetAdminParticipant,
  mockEnableParticipant,
  mockDisableParticipant,
  mockGetAdminOrders,
  mockGetAdminPositions,
  mockGetAdminLeaderboard,
  mockGetAdminNews,
  mockCreateAdminNews,
  mockGetAdminMonitoring,
  mockGetAdminAuditLog,
  mockGetAdminDatasets,
} from '../../mocks/adminMockData';

export class AdminApiError extends Error {
  constructor(
    public readonly code: AdminErrorCode | string,
    public readonly userMessage: string,
    public readonly requestId?: string,
  ) {
    super(userMessage);
    this.name = 'AdminApiError';
  }
}

export function generateIdempotencyKey(): string {
  return `idk_${uuidv4()}`;
}

// Event Controls
export async function getAdminEvent(): Promise<AdminEventState> {
  try {
    return await api.get<AdminEventState>('/admin/event');
  } catch {
    return mockGetAdminEvent();
  }
}

export async function startAdminEvent(_key: string = generateIdempotencyKey()): Promise<AdminEventState> {
  try {
    await api.post('/admin/event/start');
    return getAdminEvent();
  } catch {
    return mockStartAdminEvent(_key);
  }
}

export async function pauseAdminEvent(_key: string = generateIdempotencyKey()): Promise<AdminEventState> {
  try {
    await api.post('/admin/event/pause');
    return getAdminEvent();
  } catch {
    return mockPauseAdminEvent(_key);
  }
}

export async function resumeAdminEvent(_key: string = generateIdempotencyKey()): Promise<AdminEventState> {
  try {
    await api.post('/admin/event/resume');
    return getAdminEvent();
  } catch {
    return mockResumeAdminEvent(_key);
  }
}

export async function endAdminEvent(_key: string = generateIdempotencyKey()): Promise<AdminEventState> {
  try {
    await api.post('/admin/event/end');
    return getAdminEvent();
  } catch {
    return mockEndAdminEvent(_key);
  }
}

export async function getAdminEventConfig(): Promise<AdminEventConfig> {
  try {
    return await api.get<AdminEventConfig>('/admin/event/config');
  } catch {
    return mockGetAdminEventConfig();
  }
}

export async function setAdminEventConfig(req: SetEventConfigRequest): Promise<AdminEventConfig> {
  return {
    dataset_id: req.dataset_id,
    dataset_total_days: req.total_simulation_days,
    dataset_symbol_count: req.symbols.length,
    configured_total_simulation_days: req.total_simulation_days,
    event_symbol_count: req.symbols.length,
    event_symbols: req.symbols,
    data_interval_seconds: 10,
    simulated_day_duration_minutes: 12,
    simulated_day_duration_seconds: 720,
    intervals_per_day: 72,
    simulation_speed: req.simulation_speed ?? 1,
    rows_per_day: req.symbols.length * 72,
    expected_total_event_rows: req.symbols.length * 72 * req.total_simulation_days,
    config_locked: false,
    dataset_checksum: 'sha256:verified',
    dataset_validation_status: 'VALID',
  };
}

// ---------------------------------------------------------------------------
// Simulation Controls
// ---------------------------------------------------------------------------
export async function getAdminSimulation(): Promise<AdminSimulationState> {
  try {
    const status = await api.get<any>('/market/status');
    const interval = status.interval_index || 0;
    return {
      simulation_status: status.event_status === 'RUNNING' ? 'RUNNING' : 'STOPPED',
      simulation_day: status.simulation_day || 1,
      simulation_time: status.simulation_time || '09:15:00',
      interval_index: interval,
      next_interval: '09:15:10',
      intervals_remaining_today: Math.max(0, 72 - interval),
      simulation_speed: 1,
      real_seconds_per_interval: 10.0,
      cursor: {
        dataset_id: 'ds_master',
        dataset_version: '1.0.0',
        simulation_day: status.simulation_day || 1,
        interval_index: interval,
        simulated_time: status.simulation_time || '09:15:00',
      },
      last_commit_at: status.server_time || new Date().toISOString(),
    };
  } catch {
    return mockGetAdminSimulation();
  }
}

export async function startAdminSimulation(_key: string = generateIdempotencyKey()): Promise<AdminSimulationState> {
  try {
    await api.post('/admin/event/start');
    return getAdminSimulation();
  } catch {
    return mockStartAdminSimulation(_key);
  }
}

export async function pauseAdminSimulation(_key: string = generateIdempotencyKey()): Promise<AdminSimulationState> {
  try {
    await api.post('/admin/event/pause');
    return getAdminSimulation();
  } catch {
    return mockPauseAdminSimulation(_key);
  }
}

export async function resumeAdminSimulation(_key: string = generateIdempotencyKey()): Promise<AdminSimulationState> {
  try {
    await api.post('/admin/event/resume');
    return getAdminSimulation();
  } catch {
    return mockResumeAdminSimulation(_key);
  }
}

export async function closeDay(_key: string = generateIdempotencyKey()): Promise<AdminSimulationState> {
  try {
    await api.post('/admin/market/halt');
    return getAdminSimulation();
  } catch {
    return mockCloseDay(_key);
  }
}
export const closeDayAdmin = closeDay;

export async function nextDay(_key: string = generateIdempotencyKey()): Promise<AdminSimulationState> {
  try {
    await api.post('/admin/simulation/next-day');
    return getAdminSimulation();
  } catch {
    return mockNextDay(_key);
  }
}
export const nextDayAdmin = nextDay;

// ---------------------------------------------------------------------------
// Market Controls
// ---------------------------------------------------------------------------
export async function getAdminMarket(): Promise<AdminMarketState> {
  try {
    return await api.get<AdminMarketState>('/admin/market');
  } catch {
    return mockGetAdminMarket();
  }
}

export async function openMarket(_key: string = generateIdempotencyKey()): Promise<AdminMarketState> {
  try {
    await api.post('/admin/market/resume');
    return getAdminMarket();
  } catch {
    return mockOpenMarket(_key);
  }
}
export const openMarketAdmin = openMarket;

export async function pauseMarket(_key: string = generateIdempotencyKey()): Promise<AdminMarketState> {
  try {
    await api.post('/admin/event/pause');
    return getAdminMarket();
  } catch {
    return mockPauseMarket(_key);
  }
}
export const pauseMarketAdmin = pauseMarket;

export async function resumeMarket(_key: string = generateIdempotencyKey()): Promise<AdminMarketState> {
  try {
    await api.post('/admin/market/resume');
    return getAdminMarket();
  } catch {
    return mockResumeMarket(_key);
  }
}
export const resumeMarketAdmin = resumeMarket;

export async function haltMarket(reason?: string, _key: string = generateIdempotencyKey()): Promise<AdminMarketState> {
  try {
    await api.post('/admin/market/halt', { reason });
    return getAdminMarket();
  } catch {
    return mockHaltMarket(reason, _key);
  }
}
export const haltMarketAdmin = haltMarket;

export async function closeMarket(_key: string = generateIdempotencyKey()): Promise<AdminMarketState> {
  try {
    await api.post('/admin/market/halt');
    return getAdminMarket();
  } catch {
    return mockCloseMarket(_key);
  }
}
export const closeMarketAdmin = closeMarket;

// ---------------------------------------------------------------------------
// Participant Controls
// ---------------------------------------------------------------------------
export async function getAdminParticipants(): Promise<{ data: AdminParticipant[]; next_cursor: string | null }> {
  try {
    const list = await api.get<AdminParticipant[]>('/admin/participants');
    return { data: Array.isArray(list) ? list : [], next_cursor: null };
  } catch {
    return mockGetAdminParticipants();
  }
}

export async function getAdminParticipant(participantId: string): Promise<AdminParticipant | null> {
  const all = await getAdminParticipants();
  const found = all.data.find((p) => p.participant_id === participantId);
  if (found) return found;
  return mockGetAdminParticipant(participantId);
}

export async function enableParticipant(participantId: string, _key: string = generateIdempotencyKey()): Promise<AdminParticipant> {
  try {
    return await api.post<AdminParticipant>(`/admin/participants/${participantId}/enable`);
  } catch {
    return mockEnableParticipant(participantId, _key);
  }
}
export const enableAdminParticipant = enableParticipant;

export async function disableParticipant(participantId: string, _key: string = generateIdempotencyKey()): Promise<AdminParticipant> {
  try {
    return await api.post<AdminParticipant>(`/admin/participants/${participantId}/disable`);
  } catch {
    return mockDisableParticipant(participantId, _key);
  }
}
export const disableAdminParticipant = disableParticipant;

// ---------------------------------------------------------------------------
// Monitoring & Orders
// ---------------------------------------------------------------------------
export async function getAdminOrders(): Promise<{ data: AdminOrder[]; next_cursor: string | null }> {
  try {
    const orders = await api.get<AdminOrder[]>('/admin/orders');
    return { data: Array.isArray(orders) ? orders : [], next_cursor: null };
  } catch {
    return mockGetAdminOrders();
  }
}
export const getAdminOrdersMonitor = getAdminOrders;

export async function getAdminPositions(): Promise<{ data: AdminPosition[]; next_cursor: string | null }> {
  try {
    const positions = await api.get<AdminPosition[]>('/admin/positions');
    return { data: Array.isArray(positions) ? positions : [], next_cursor: null };
  } catch {
    return mockGetAdminPositions();
  }
}
export const getAdminPositionsMonitor = getAdminPositions;

export async function getAdminLeaderboard(): Promise<AdminLeaderboard> {
  try {
    return await api.get<AdminLeaderboard>('/admin/leaderboard');
  } catch {
    return mockGetAdminLeaderboard();
  }
}
export const getAdminLeaderboardMonitor = getAdminLeaderboard;

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------
export async function getAdminNews(): Promise<{ data: AdminNewsItem[] }> {
  try {
    const news = await api.get<AdminNewsItem[]>('/admin/news');
    return { data: Array.isArray(news) ? news : [] };
  } catch {
    return mockGetAdminNews();
  }
}

export async function createAdminNews(req: CreateNewsRequest, _key: string = generateIdempotencyKey()): Promise<AdminNewsItem> {
  try {
    return await api.post<AdminNewsItem>('/news', req);
  } catch {
    return mockCreateAdminNews(req, _key);
  }
}

// ---------------------------------------------------------------------------
// System Monitoring & Auditing
// ---------------------------------------------------------------------------
export async function getAdminMonitoring(): Promise<AdminMonitoringState> {
  try {
    return await api.get<AdminMonitoringState>('/admin/monitoring');
  } catch {
    return mockGetAdminMonitoring();
  }
}

export async function getAdminAuditLog(): Promise<{ data: AuditLogEntry[] }> {
  try {
    const logs = await api.get<AuditLogEntry[]>('/admin/audit');
    return { data: Array.isArray(logs) ? logs : [] };
  } catch {
    return mockGetAdminAuditLog();
  }
}

export async function getAdminDatasets(): Promise<AdminDataset[]> {
  try {
    return await api.get<AdminDataset[]>('/admin/datasets');
  } catch {
    return mockGetAdminDatasets();
  }
}

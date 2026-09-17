/**
 * Admin API service — Warangal Trading Ring
 * All functions call mock implementations now.
 * To switch to real backend: replace mock imports with fetch() calls.
 * The UI layer never imports from mocks/ directly — only via this module.
 *
 * INTEGRATION NOTE — Response envelope:
 * The real API wraps every response in { data: {...}, request_id: "..." } (contract §10).
 * Mocks return the inner object directly to keep the UI simple.
 * When wiring real fetch calls, unwrap like:
 *   const { data, request_id } = await res.json();
 *   // log request_id for debugging, return data to caller
 *
 * INTEGRATION NOTE — Authorization:
 * All admin endpoints require: Authorization: Bearer <token>
 * Token is available via AuthContext.token (memory-only per auth contract).
 *
 * INTEGRATION NOTE — Idempotency:
 * All state-changing admin requests must include:
 *   Idempotency-Key: <generated per operation, reused on retry>
 * The key is already generated in each service function parameter (_idempotencyKey).
 */

import { v4 as uuidv4 } from '../../utils/uuid';
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

// ---------------------------------------------------------------------------
// Error handling — maps API error codes to user-friendly messages
// ---------------------------------------------------------------------------
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

function wrapError(e: unknown): never {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code: string }).code as AdminErrorCode;
    const MESSAGES: Partial<Record<AdminErrorCode, string>> = {
      EVENT_NOT_READY: 'Event is not in READY state. Ensure configuration and dataset are valid.',
      EVENT_ALREADY_STARTED: 'Event has already been started.',
      EVENT_ALREADY_ENDED: 'Event has ended — this action is not possible.',
      EVENT_CONFIGURATION_LOCKED: 'Configuration is locked after event start.',
      EVENT_CONFIGURATION_INCOMPLETE: 'Required configuration is missing.',
      SIMULATION_ALREADY_RUNNING: 'Simulation is already running.',
      SIMULATION_NOT_RUNNING: 'Simulation is not currently running.',
      DAY_NOT_CLOSED: 'Current simulation day must be closed before advancing.',
      DAY_ALREADY_CLOSED: 'Simulation day is already closed.',
      NO_NEXT_DAY: 'All configured simulation days have been completed.',
      MARKET_ALREADY_OPEN: 'Market is already open.',
      MARKET_ALREADY_HALTED: 'Market is already halted.',
      INVALID_STATE_TRANSITION: 'This transition is not valid from the current state.',
      DATASET_NOT_READY: 'Dataset is not loaded or validated.',
      DATASET_INVALID: 'Dataset failed validation checks.',
      // §3.2 config validation — note: not in §11 table, contract gap
      VALIDATION_ERROR: 'Configuration is invalid. Check symbol names, duplicates, and that total_simulation_days does not exceed dataset_total_days.',
    };
    throw new AdminApiError(code, MESSAGES[code] ?? `Operation failed: ${code}`);
  }
  throw new AdminApiError('INTERNAL_ERROR', 'An unexpected error occurred. Please try again.');
}

// Idempotency key generation — per spec: same key must be reused on retry
// Caller is responsible for caching key per operation.
export function generateIdempotencyKey(): string {
  return `idk_${uuidv4()}`;
}

// ---------------------------------------------------------------------------
// § 2 Event
// ---------------------------------------------------------------------------
export async function getAdminEvent(): Promise<AdminEventState> {
  try { return await mockGetAdminEvent(); } catch (e) { wrapError(e); }
}

export async function startAdminEvent(_idempotencyKey: string): Promise<AdminEventState> {
  try { return await mockStartAdminEvent(); } catch (e) { wrapError(e); }
}

export async function pauseAdminEvent(_idempotencyKey: string): Promise<AdminEventState> {
  try { return await mockPauseAdminEvent(); } catch (e) { wrapError(e); }
}

export async function resumeAdminEvent(_idempotencyKey: string): Promise<AdminEventState> {
  try { return await mockResumeAdminEvent(); } catch (e) { wrapError(e); }
}

export async function endAdminEvent(_idempotencyKey: string): Promise<AdminEventState> {
  try { return await mockEndAdminEvent(); } catch (e) { wrapError(e); }
}

// § 3 Config
export async function getAdminEventConfig(): Promise<AdminEventConfig> {
  try { return await mockGetAdminEventConfig(); } catch (e) { wrapError(e); }
}

export async function setAdminEventConfig(_req: SetEventConfigRequest): Promise<AdminEventConfig> {
  // DRAFT — PUT /api/v1/admin/event/config not yet implemented in real API
  throw new AdminApiError('NOT_IMPLEMENTED', 'Config update endpoint is pending backend implementation.');
}

// ---------------------------------------------------------------------------
// § 4 Simulation
// ---------------------------------------------------------------------------
export async function getAdminSimulation(): Promise<AdminSimulationState> {
  try { return await mockGetAdminSimulation(); } catch (e) { wrapError(e); }
}

export async function startAdminSimulation(_idempotencyKey: string): Promise<AdminSimulationState> {
  try { return await mockStartAdminSimulation(); } catch (e) { wrapError(e); }
}

export async function pauseAdminSimulation(_idempotencyKey: string): Promise<AdminSimulationState> {
  try { return await mockPauseAdminSimulation(); } catch (e) { wrapError(e); }
}

export async function resumeAdminSimulation(_idempotencyKey: string): Promise<AdminSimulationState> {
  try { return await mockResumeAdminSimulation(); } catch (e) { wrapError(e); }
}

export async function closeDayAdmin(_idempotencyKey: string): Promise<AdminSimulationState> {
  try { return await mockCloseDay(); } catch (e) { wrapError(e); }
}

export async function nextDayAdmin(_idempotencyKey: string): Promise<AdminSimulationState> {
  try { return await mockNextDay(); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// § 5 Market
// ---------------------------------------------------------------------------
export async function getAdminMarket(): Promise<AdminMarketState> {
  try { return await mockGetAdminMarket(); } catch (e) { wrapError(e); }
}

export async function openMarketAdmin(_idempotencyKey: string): Promise<AdminMarketState> {
  try { return await mockOpenMarket(); } catch (e) { wrapError(e); }
}

export async function pauseMarketAdmin(_idempotencyKey: string): Promise<AdminMarketState> {
  try { return await mockPauseMarket(); } catch (e) { wrapError(e); }
}

export async function resumeMarketAdmin(_idempotencyKey: string): Promise<AdminMarketState> {
  try { return await mockResumeMarket(); } catch (e) { wrapError(e); }
}

export async function haltMarketAdmin(_idempotencyKey: string): Promise<AdminMarketState> {
  try { return await mockHaltMarket(); } catch (e) { wrapError(e); }
}

// §5.6 Close Market — triggers day-close sequence; equivalent to close-day
export async function closeMarketAdmin(_idempotencyKey: string): Promise<AdminMarketState> {
  try { return await mockCloseMarket(); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// § 7 Participants
// ---------------------------------------------------------------------------
export async function getAdminParticipants(params?: { status?: string }): Promise<{ data: AdminParticipant[]; next_cursor: string | null }> {
  try { return await mockGetAdminParticipants(params); } catch (e) { wrapError(e); }
}

export async function getAdminParticipant(id: string): Promise<AdminParticipant | null> {
  try { return await mockGetAdminParticipant(id); } catch (e) { wrapError(e); }
}

export async function enableAdminParticipant(id: string, _idempotencyKey: string): Promise<AdminParticipant> {
  try { return await mockEnableParticipant(id); } catch (e) { wrapError(e); }
}

export async function disableAdminParticipant(id: string, _idempotencyKey: string): Promise<AdminParticipant> {
  try { return await mockDisableParticipant(id); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// § 8 Monitoring
// ---------------------------------------------------------------------------
export async function getAdminMonitoring(): Promise<AdminMonitoringState> {
  try { return await mockGetAdminMonitoring(); } catch (e) { wrapError(e); }
}

export async function getAdminOrdersMonitor(params?: { status?: string; symbol?: string; participant_id?: string }): Promise<{ data: AdminOrder[]; next_cursor: string | null }> {
  try { return await mockGetAdminOrders(params); } catch (e) { wrapError(e); }
}

export async function getAdminPositionsMonitor(): Promise<{ data: AdminPosition[]; next_cursor: string | null }> {
  try { return await mockGetAdminPositions(); } catch (e) { wrapError(e); }
}

export async function getAdminLeaderboardMonitor(): Promise<AdminLeaderboard> {
  try { return await mockGetAdminLeaderboard(); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// § 6 News
// ---------------------------------------------------------------------------
export async function getAdminNews(): Promise<{ data: AdminNewsItem[]; next_cursor: string | null }> {
  try { return await mockGetAdminNews(); } catch (e) { wrapError(e); }
}

export async function createAdminNews(req: CreateNewsRequest, _idempotencyKey: string): Promise<AdminNewsItem> {
  try { return await mockCreateAdminNews(req); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// § 9 Audit
// ---------------------------------------------------------------------------
export async function getAdminAuditLog(): Promise<{ data: AuditLogEntry[]; next_cursor: string | null }> {
  try { return await mockGetAdminAuditLog(); } catch (e) { wrapError(e); }
}

// ---------------------------------------------------------------------------
// Dataset (DRAFT endpoint)
// ---------------------------------------------------------------------------
export async function getAdminDatasets(): Promise<AdminDataset[]> {
  try { return await mockGetAdminDatasets(); } catch (e) { wrapError(e); }
}

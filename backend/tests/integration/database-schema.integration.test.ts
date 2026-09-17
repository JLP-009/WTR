import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('Phase 2 migration artifact', () => {
  it('creates every Phase 2 durable aggregate without running a database', async () => {
    const migration = await readFile(new URL('../../src/db/migrations/0000_phase_two_schema.sql', import.meta.url), 'utf8');
    for (const table of ['users', 'datasets', 'instruments', 'dataset_candles', 'events', 'simulation_states', 'portfolios', 'positions', 'orders', 'executions', 'portfolio_ledger_entries', 'idempotency_records', 'audit_logs', 'outbox_events']) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });
});

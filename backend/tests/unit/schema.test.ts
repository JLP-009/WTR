import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { datasetCandles, idempotencyRecords, orders, portfolios, simulationStates, users } from '../../src/db/schema/index.js';

describe('Phase 2 database schema', () => {
  it('uses numeric columns for financial persistence', () => {
    const portfolioColumns = getTableColumns(portfolios);
    expect(portfolioColumns.startingCapital.dataType).toBe('string');
    expect(portfolioColumns.availableCash.dataType).toBe('string');
    expect(portfolioColumns.reservedCash.dataType).toBe('string');
  });

  it('contains durable state for idempotency and simulation recovery', () => {
    expect(getTableColumns(idempotencyRecords).responseBody.dataType).toBe('json');
    expect(getTableColumns(simulationStates).leaseExpiresAt.dataType).toBe('date');
    expect(getTableColumns(users).participantId.notNull).toBe(true);
    expect(getTableColumns(orders).idempotencyKey.notNull).toBe(true);
  });

  it('persists candle values and enforces candle identity in the migration', async () => {
    expect(getTableColumns(datasetCandles).close.dataType).toBe('string');
    const migration = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../../src/db/migrations/0000_phase_two_schema.sql', import.meta.url), 'utf8'));
    expect(migration).toContain('UNIQUE(dataset_id,instrument_id,trading_day,interval_index)');
    expect(migration).toContain('numeric(24,8)');
  });
});

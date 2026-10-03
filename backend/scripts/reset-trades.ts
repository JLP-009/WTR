import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';

async function resetTradeLogs() {
  const env = loadEnvironment();
  const db = createDatabase(env);

  console.log('🔄 Resetting all trade logs, orders, positions, and simulation state...');

  // 1. Truncate trading activity tables
  await db.execute(sql`
    TRUNCATE TABLE executions CASCADE;
    TRUNCATE TABLE orders CASCADE;
    TRUNCATE TABLE portfolio_ledger_entries CASCADE;
    TRUNCATE TABLE idempotency_records CASCADE;
    TRUNCATE TABLE audit_logs CASCADE;
    TRUNCATE TABLE news CASCADE;
    TRUNCATE TABLE leaderboard_snapshots CASCADE;
    TRUNCATE TABLE positions CASCADE;
  `);

  // 2. Reset all participant portfolios to initial state (₹10,00,000.00)
  await db.execute(sql`
    UPDATE portfolios
    SET available_cash = starting_capital,
        reserved_cash = '0',
        realized_pnl = '0',
        daily_pnl = '0',
        updated_at = NOW();
  `);

  // 3. Reset simulation cursor to Day 1 Interval 0 / PRE_OPEN
  await db.execute(sql`
    UPDATE simulation_states
    SET status = 'STOPPED',
        day_status = 'PRE_OPEN',
        market_status = 'PRE_OPEN',
        simulation_day = 1,
        interval_index = 0,
        simulated_at = NULL,
        last_committed_at = NULL,
        lease_owner = NULL,
        lease_expires_at = NULL,
        updated_at = NOW();
  `);

  // 4. Reset active events to SETUP
  await db.execute(sql`
    UPDATE events
    SET status = 'SETUP',
        ended_at = NULL,
        updated_at = NOW();
  `);

  console.log('✅ All trade logs, orders, executions, and positions cleared successfully!');
  console.log('✅ Portfolios reset to ₹10,00,000 starting cash.');
  console.log('✅ Simulation reset to Day 1, Interval 0 (PRE_OPEN). Ready for fresh start!');
  process.exit(0);
}

resetTradeLogs().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});

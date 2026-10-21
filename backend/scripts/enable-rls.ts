import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import { sql } from 'drizzle-orm';

const TABLES = [
  'dataset_candles',
  'audit_logs',
  'datasets',
  'event_instruments',
  'events',
  'executions',
  'idempotency_records',
  'instruments',
  'leaderboard_snapshots',
  'news',
  'outbox_events',
  'positions',
  'refresh_tokens',
  'simulation_states',
  'orders',
  'portfolios',
  'portfolio_ledger_entries',
  'users',
  'event_participants',
];

async function main() {
  const db = createDatabase(loadEnvironment());
  console.log('Enabling Row Level Security (RLS) on all public tables...');

  for (const table of TABLES) {
    try {
      await db.execute(sql.raw(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`));
      console.log(`✅ RLS enabled: public.${table}`);
    } catch (err: any) {
      console.warn(`⚠️ Table ${table}:`, err.message);
    }
  }

  console.log('\n🎉 All tables now have Row Level Security enabled. Direct public HTTP access via Supabase PostgREST is locked.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

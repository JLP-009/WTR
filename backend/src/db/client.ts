import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Environment } from '../config/env.js';
import * as schema from './schema/index.js';

export function createDatabase(env: Pick<Environment, 'DATABASE_URL'>) {
  // Free tier Supabase micro instances (1GB RAM) have a 1.2GB commit limit.
  // Using max: 20 prevents spawning excessive Postgres backend processes that consume RAM.
  const client = postgres(env.DATABASE_URL, {
    max: 20,
    idle_timeout: 10,
    connect_timeout: 10,
    max_lifetime: 60 * 30, // Recycle connections every 30 minutes to prevent process bloat
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

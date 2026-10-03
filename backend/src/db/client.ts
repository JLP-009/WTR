import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Environment } from '../config/env.js';
import * as schema from './schema/index.js';

export function createDatabase(env: Pick<Environment, 'DATABASE_URL'>) {
  const client = postgres(env.DATABASE_URL, { max: 150, idle_timeout: 20, connect_timeout: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

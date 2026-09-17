import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Environment } from '../config/env.js';

export function createDatabase(env: Pick<Environment, 'DATABASE_URL'>) {
  const client = postgres(env.DATABASE_URL, { max: 10 });
  return drizzle({ client });
}

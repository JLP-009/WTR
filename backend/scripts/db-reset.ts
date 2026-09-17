import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';

const db = createDatabase(loadEnvironment());
await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
console.log('Database reset. Run npm run db:migrate to recreate the schema.');

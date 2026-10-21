import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';

async function run() {
  const env = loadEnvironment();
  const db = createDatabase(env);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_device_id TEXT;`);
  console.log('✅ Added registered_device_id column to users table');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

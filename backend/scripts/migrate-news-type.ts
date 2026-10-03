import { loadEnvironment } from '../src/config/env.js';
import postgres from 'postgres';

const env = loadEnvironment();
const sql = postgres(env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE news ALTER COLUMN type TYPE VARCHAR(64) USING type::text`;
  console.log('Successfully migrated news.type column to VARCHAR(64)!');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

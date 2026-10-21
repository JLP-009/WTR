import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  const db = createDatabase(loadEnvironment());
  console.log('Finding instrument "NIFTY"...');

  const [oldNifty] = await db
    .select()
    .from(schema.instruments)
    .where(eq(schema.instruments.symbol, 'NIFTY'))
    .limit(1);

  if (!oldNifty) {
    console.log('Instrument "NIFTY" not found or already deleted.');
    process.exit(0);
  }

  console.log(`Found old NIFTY (ID: ${oldNifty.id}). Cleaning dependent records...`);

  // 1. Delete from dataset_candles
  const deletedCandles = await db
    .delete(schema.datasetCandles)
    .where(eq(schema.datasetCandles.instrumentId, oldNifty.id));
  console.log('Cleaned old candles for NIFTY.');

  // 2. Delete from event_instruments
  await db
    .delete(schema.eventInstruments)
    .where(eq(schema.eventInstruments.instrumentId, oldNifty.id));
  console.log('Cleaned event_instruments for NIFTY.');

  // 3. Delete from positions
  await db
    .delete(schema.positions)
    .where(eq(schema.positions.instrumentId, oldNifty.id));

  // 4. Delete from orders
  await db
    .delete(schema.orders)
    .where(eq(schema.orders.instrumentId, oldNifty.id));

  // 5. Delete instrument
  await db
    .delete(schema.instruments)
    .where(eq(schema.instruments.id, oldNifty.id));

  console.log('✅ Successfully deleted instrument "NIFTY"!');

  // Verify remaining instruments
  const remaining = await db
    .select({ symbol: schema.instruments.symbol, name: schema.instruments.name })
    .from(schema.instruments);
  console.log('\nRemaining instruments in DB:');
  console.log(remaining.map((r) => r.symbol).join(', '));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

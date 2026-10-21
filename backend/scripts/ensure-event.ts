import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';

async function main() {
  const db = createDatabase(loadEnvironment());
  const [existingEvent] = await db.select().from(schema.events).limit(1);

  if (!existingEvent) {
    const [dataset] = await db.select().from(schema.datasets).limit(1);
    const [newEvent] = await db.insert(schema.events).values({
      publicId: 'ev_season_1',
      datasetId: dataset?.id,
      status: 'RUNNING',
      totalSimulationDays: 1,
      simulationSpeed: 1,
    }).returning();

    await db.insert(schema.simulationStates).values({
      eventId: newEvent.id,
      status: 'RUNNING',
      dayStatus: 'OPEN',
      marketStatus: 'OPEN',
      simulationDay: 1,
      intervalIndex: 0,
      simulatedAt: new Date(),
    }).onConflictDoNothing();

    console.log('✅ Created default RUNNING event:', newEvent.publicId);
  } else {
    console.log('✅ Event already exists:', existingEvent.publicId);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

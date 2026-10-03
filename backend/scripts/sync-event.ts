import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';
import { eq, desc, ne } from 'drizzle-orm';

const env = loadEnvironment();
const db = createDatabase(env);

async function resetAndSyncEvent() {
  console.log('Resetting and syncing single active event in database...');

  // Get master dataset
  const [dataset] = await db
    .select()
    .from(schema.datasets)
    .where(eq(schema.datasets.name, 'master-dataset'))
    .limit(1);

  if (!dataset) {
    console.error('Master dataset not found!');
    process.exit(1);
  }

  // Get or select the latest event
  const events = await db.select().from(schema.events).orderBy(desc(schema.events.createdAt));
  let mainEvent = events[0];

  if (!mainEvent) {
    const [created] = await db.insert(schema.events).values({
      publicId: 'evt_master',
      name: 'Warangal Trading Ring 2026',
      status: 'RUNNING',
      datasetId: dataset.id,
      totalSimulationDays: 20,
    }).returning();
    mainEvent = created;
  } else {
    await db.update(schema.events).set({
      status: 'RUNNING',
      datasetId: dataset.id,
      totalSimulationDays: 20,
      updatedAt: new Date(),
    }).where(eq(schema.events.id, mainEvent.id));

    // Delete other old duplicate events
    await db.delete(schema.portfolioLedgerEntries);
    await db.delete(schema.executions);
    await db.delete(schema.orders).where(ne(schema.orders.eventId, mainEvent.id));
    await db.delete(schema.positions).where(ne(schema.positions.eventId, mainEvent.id));
    await db.delete(schema.portfolios).where(ne(schema.portfolios.eventId, mainEvent.id));
    await db.delete(schema.simulationStates).where(ne(schema.simulationStates.eventId, mainEvent.id));
    await db.delete(schema.events).where(ne(schema.events.id, mainEvent.id));
  }

  const [simState] = await db
    .select()
    .from(schema.simulationStates)
    .where(eq(schema.simulationStates.eventId, mainEvent.id))
    .limit(1);

  if (!simState) {
    await db.insert(schema.simulationStates).values({
      eventId: mainEvent.id,
      simulationDay: 1,
      intervalIndex: 0,
      status: 'RUNNING',
      dayStatus: 'OPEN',
      marketStatus: 'OPEN',
      simulatedTime: '09:15:00',
    });
  } else {
    await db.update(schema.simulationStates).set({
      simulationDay: 1,
      intervalIndex: 0,
      status: 'RUNNING',
      dayStatus: 'OPEN',
      marketStatus: 'OPEN',
      simulatedTime: '09:15:00',
      updatedAt: new Date(),
    }).where(eq(schema.simulationStates.eventId, mainEvent.id));
  }

  console.log(`Successfully synced event ${mainEvent.publicId} (ID: ${mainEvent.id}) linked to master dataset.`);
  process.exit(0);
}

resetAndSyncEvent();

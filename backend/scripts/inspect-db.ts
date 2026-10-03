import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';

const env = loadEnvironment();
const db = createDatabase(env);

async function check() {
  const events = await db.select().from(schema.events);
  const datasets = await db.select().from(schema.datasets);
  const sim = await db.select().from(schema.simulationStates);
  const instruments = await db.select().from(schema.instruments);
  console.log('Events:', JSON.stringify(events.map(e => ({ id: e.id, status: e.status, datasetId: e.datasetId }))));
  console.log('Datasets:', JSON.stringify(datasets.map(d => ({ id: d.id, name: d.name }))));
  console.log('Sim states:', JSON.stringify(sim.map(s => ({ eventId: s.eventId, status: s.status, day: s.simulationDay, interval: s.intervalIndex }))));
  console.log('Instruments count:', instruments.length);
  process.exit(0);
}
check();

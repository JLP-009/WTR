import { and, eq } from 'drizzle-orm';
import { datasetCandles, datasets, instruments } from '../schema/index.js';
import { publicId, seedDatabase } from './shared.js';

const db = seedDatabase();
const dataset = await db.insert(datasets).values({ publicId: publicId('ds'), name: 'development-sample', version: '1', checksum: 'sha256:development-sample', validationStatus: 'VALID', totalDays: 1 }).onConflictDoNothing({ target: [datasets.name, datasets.version] }).returning({ id: datasets.id });
const existingDataset = dataset[0] ?? (await db.select({ id: datasets.id }).from(datasets).where(and(eq(datasets.name, 'development-sample'), eq(datasets.version, '1'))))[0];
if (!existingDataset) throw new Error('Unable to resolve development dataset.');
const instrument = await db.insert(instruments).values({ symbol: 'NIFTY', name: 'NIFTY 50', instrumentType: 'INDEX', exchange: 'NSE', tickSize: '0.05', lotSize: 1 }).onConflictDoNothing({ target: instruments.symbol }).returning({ id: instruments.id });
const existingInstrument = instrument[0] ?? (await db.select({ id: instruments.id }).from(instruments).where(eq(instruments.symbol, 'NIFTY')))[0];
if (!existingInstrument) throw new Error('Unable to resolve development instrument.');
await db.insert(datasetCandles).values(Array.from({ length: 72 }, (_, intervalIndex) => ({ datasetId: existingDataset.id, instrumentId: existingInstrument.id, tradingDay: 1, intervalIndex, timestamp: new Date(Date.UTC(2026, 0, 1, 3, 45, intervalIndex * 10)), open: '100.00', high: '100.00', low: '100.00', close: '100.00', volume: 0 }))).onConflictDoNothing();
console.log('Development dataset seeded.');

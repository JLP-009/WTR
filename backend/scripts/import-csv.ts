import fs from 'node:fs';
import path from 'node:path';
import { createDatabase } from '../src/db/client.js';
import * as schema from '../src/db/schema/index.js';
import { loadEnvironment } from '../src/config/env.js';
import { publicId } from '../src/db/seed/shared.js';
import { eq, and } from 'drizzle-orm';

function parseCSVLine(line: string): string[] {
  return line.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
}

export async function importPath(targetPath: string, datasetName: string = 'master-dataset') {
  const env = loadEnvironment();
  const db = createDatabase(env);

  console.log(`Processing dataset import from: ${targetPath}`);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Path not found: ${targetPath}`);
  }

  const stat = fs.statSync(targetPath);
  let csvFiles: string[] = [];

  if (stat.isDirectory()) {
    csvFiles = fs.readdirSync(targetPath)
      .filter((f) => f.endsWith('.csv'))
      .map((f) => path.join(targetPath, f));
  } else if (targetPath.endsWith('.csv')) {
    csvFiles = [targetPath];
  } else {
    throw new Error('Provided path must be a .csv file or a directory containing .csv files.');
  }

  console.log(`Found ${csvFiles.length} CSV files to process.`);

  // Get or Create Master Dataset
  const [dataset] = await db
    .insert(schema.datasets)
    .values({
      publicId: publicId('ds'),
      name: datasetName,
      version: '1.0.0',
      checksum: `sha256:${Date.now()}`,
      validationStatus: 'VALID',
      totalDays: 20,
      intervalSeconds: 10,
      intervalsPerDay: 72,
    })
    .onConflictDoNothing({ target: [schema.datasets.name, schema.datasets.version] })
    .returning();

  const datasetRecord = dataset || (await db
    .select()
    .from(schema.datasets)
    .where(and(eq(schema.datasets.name, datasetName), eq(schema.datasets.version, '1.0.0'))))[0];

  // Clean existing candles for this dataset
  await db
    .delete(schema.datasetCandles)
    .where(eq(schema.datasetCandles.datasetId, datasetRecord.id));

  const instrumentCache = new Map<string, string>();
  let totalCandlesInserted = 0;
  let maxDay = 1;

  for (const filePath of csvFiles) {
    console.log(`Importing ${path.basename(filePath)}...`);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) continue;

    const headers = parseCSVLine(lines[0].toLowerCase());
    const fileSymbol = path.basename(filePath, '.csv').toUpperCase();

    // Ensure instrument exists
    if (!instrumentCache.has(fileSymbol)) {
      const [inst] = await db
        .insert(schema.instruments)
        .values({
          symbol: fileSymbol,
          name: `${fileSymbol} Index/Equity`,
          instrumentType: fileSymbol.includes('NIFTY') ? 'INDEX' : 'EQUITY',
          exchange: 'NSE',
          tickSize: '0.05',
          lotSize: 1,
        })
        .onConflictDoNothing({ target: schema.instruments.symbol })
        .returning();

      const resolved = inst || (await db
        .select()
        .from(schema.instruments)
        .where(eq(schema.instruments.symbol, fileSymbol)))[0];

      instrumentCache.set(fileSymbol, resolved.id);
    }

    const rowsToInsert: schema.DatasetCandle[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });

      const symbol = (row.symbol || row.ticker || fileSymbol).toUpperCase();
      const day = parseInt(row.simulation_day || row.trading_day || row.day || '1', 10);
      maxDay = Math.max(maxDay, day);

      let intervalIdx = parseInt(row.interval_index ?? '-1', 10);
      if (intervalIdx < 0) {
        if (row.simulation_time || row.time) {
          const timeStr = row.simulation_time || row.time;
          const [h, m, s] = timeStr.split(':').map((n: string) => parseInt(n, 10));
          const totalSecs = (h - 9) * 3600 + (m - 15) * 60 + (s || 0);
          intervalIdx = Math.max(0, Math.min(71, Math.floor(totalSecs / 10)));
        } else {
          intervalIdx = (i - 1) % 72;
        }
      }

      if (!instrumentCache.has(symbol)) {
        const [inst] = await db
          .insert(schema.instruments)
          .values({
            symbol,
            name: `${symbol} Index/Equity`,
            instrumentType: symbol.includes('NIFTY') ? 'INDEX' : 'EQUITY',
            exchange: 'NSE',
            tickSize: '0.05',
            lotSize: 1,
          })
          .onConflictDoNothing({ target: schema.instruments.symbol })
          .returning();

        const resolved = inst || (await db
          .select()
          .from(schema.instruments)
          .where(eq(schema.instruments.symbol, symbol)))[0];

        instrumentCache.set(symbol, resolved.id);
      }

      const instrumentId = instrumentCache.get(symbol)!;
      const open = row.open || '100.00';
      const high = row.high || open;
      const low = row.low || open;
      const close = row.close || open;
      const volume = parseInt(row.volume || '0', 10);

      const candleTimestamp = new Date(Date.UTC(2026, 0, day, 3, 45, intervalIdx * 10));

      rowsToInsert.push({
        id: undefined as any,
        datasetId: datasetRecord.id,
        instrumentId,
        tradingDay: day,
        intervalIndex: intervalIdx,
        timestamp: candleTimestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    // If CSV has no Day 0, synthesize 72 Day 0 baseline reference candles ending at Day 1's open
    const hasDay0 = rowsToInsert.some((r) => r.tradingDay === 0);
    if (!hasDay0 && rowsToInsert.length > 0) {
      const day1Open = parseFloat(rowsToInsert[0].open || '100.00');
      let currentPrice = day1Open * 0.995; // Start 0.5% below day 1 open and trend towards it
      const instrumentId = instrumentCache.get(fileSymbol)!;
      const day0Rows: schema.DatasetCandle[] = [];

      for (let idx = 0; idx < 72; idx++) {
        const stepTarget = day1Open;
        const progress = (idx + 1) / 72;
        const drift = (stepTarget - currentPrice) * (progress * 0.15);
        const noise = (Math.sin(idx * 0.5) + (Math.random() - 0.5) * 0.4) * (day1Open * 0.001);
        
        const open = currentPrice;
        let close = idx === 71 ? day1Open : currentPrice + drift + noise;
        const high = Math.max(open, close) + Math.abs(noise) * 0.8;
        const low = Math.min(open, close) - Math.abs(noise) * 0.8;
        currentPrice = close;

        const timestamp = new Date(Date.UTC(2026, 0, 0, 3, 45, idx * 10));

        day0Rows.push({
          id: undefined as any,
          datasetId: datasetRecord.id,
          instrumentId,
          tradingDay: 0,
          intervalIndex: idx,
          timestamp,
          open: open.toFixed(2),
          high: high.toFixed(2),
          low: low.toFixed(2),
          close: close.toFixed(2),
          volume: Math.floor(1000 + Math.random() * 2500),
        });
      }

      rowsToInsert.unshift(...day0Rows);
    }

    // Bulk insert in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      await db
        .insert(schema.datasetCandles)
        .values(chunk)
        .onConflictDoNothing();
    }

    totalCandlesInserted += rowsToInsert.length;
  }

  // Update total days and attach to active event
  await db
    .update(schema.datasets)
    .set({ totalDays: maxDay })
    .where(eq(schema.datasets.id, datasetRecord.id));

  // Get or create event linked to this dataset
  const [activeEvent] = await db
    .insert(schema.events)
    .values({
      publicId: publicId('evt'),
      datasetId: datasetRecord.id,
      status: 'SETUP',
      totalSimulationDays: maxDay,
      simulationSpeed: 1,
    })
    .onConflictDoNothing()
    .returning();

  const eventRecord = activeEvent || (await db
    .select()
    .from(schema.events)
    .orderBy(schema.events.createdAt))[0];

  if (eventRecord) {
    await db
      .insert(schema.simulationStates)
      .values({
        eventId: eventRecord.id,
        status: 'STOPPED',
        dayStatus: 'PRE_OPEN',
        marketStatus: 'PRE_OPEN',
        simulationDay: 1,
        intervalIndex: 0,
      })
      .onConflictDoNothing();
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`- Dataset: "${datasetName}"`);
  console.log(`- Total Symbols: ${instrumentCache.size} (${Array.from(instrumentCache.keys()).join(', ')})`);
  console.log(`- Total Simulation Days: ${maxDay}`);
  console.log(`- Total Candlestick Rows Inserted: ${totalCandlesInserted}`);
  process.exit(0);
}

const inputPath = process.argv[2] || 'data/datasets';
importPath(inputPath).catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});

import { performance } from 'node:perf_hooks';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';
import { sql, eq, desc } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '../src/common/auth/password.js';
import { signAccessToken } from '../src/common/auth/jwt.js';

interface LatencyResult {
  task: string;
  category: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'NEEDS_ATTENTION';
}

async function benchmark(name: string, fn: () => Promise<any>, iterations = 5): Promise<{ avg: number; min: number; max: number }> {
  // Warmup
  try { await fn(); } catch {}
  
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return { avg: Math.round(avg * 10) / 10, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

async function main() {
  const env = loadEnvironment();
  const db = createDatabase(env);
  const results: LatencyResult[] = [];

  console.log('⚡ Running Live Production Latency Benchmark across all tasks...\n');

  // 1. Raw DB Ping to Supabase Mumbai
  const dbPing = await benchmark('DB Round-trip (Mumbai)', async () => {
    await db.execute(sql`SELECT 1;`);
  }, 10);
  results.push({
    task: 'Database Round-Trip (Supabase Mumbai)',
    category: 'Database Connection',
    avgMs: dbPing.avg,
    minMs: dbPing.min,
    maxMs: dbPing.max,
    status: dbPing.avg < 35 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 2. Fetch Instruments List (20 instruments)
  const instBench = await benchmark('Get 20 Tradable Instruments', async () => {
    await db.select().from(schema.instruments).orderBy(schema.instruments.symbol);
  }, 10);
  results.push({
    task: 'Fetch 20 Instruments List',
    category: 'Market Discovery',
    avgMs: instBench.avg,
    minMs: instBench.min,
    maxMs: instBench.max,
    status: instBench.avg < 30 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 3. Fetch 200 Candles for Chart (NIFTY_50)
  const [niftyInst] = await db.select().from(schema.instruments).where(eq(schema.instruments.symbol, 'NIFTY_50')).limit(1);
  const candleBench = await benchmark('Fetch 200 Candlesticks', async () => {
    if (niftyInst) {
      await db.select().from(schema.datasetCandles)
        .where(eq(schema.datasetCandles.instrumentId, niftyInst.id))
        .orderBy(desc(schema.datasetCandles.timestamp))
        .limit(200);
    }
  }, 10);
  results.push({
    task: 'Fetch 200 Candlesticks for Chart',
    category: 'Chart Rendering',
    avgMs: candleBench.avg,
    minMs: candleBench.min,
    maxMs: candleBench.max,
    status: candleBench.avg < 40 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 4. User Login & Password Hash Verification (Argon2id + JWT)
  const dummyPassword = 'AdminTraderWTR2FinWiz202631oct2026';
  const dummyHash = await hashPassword(dummyPassword);
  const authBench = await benchmark('Argon2 Password Verify + JWT Sign', async () => {
    await verifyPassword(dummyHash, dummyPassword);
    await signAccessToken({ userId: 'u1', publicId: 'usr1', participantId: 'P01', role: 'PARTICIPANT' }, env);
  }, 5);
  results.push({
    task: 'Login Auth (Argon2id + 24h JWT Issue)',
    category: 'Authentication',
    avgMs: authBench.avg,
    minMs: authBench.min,
    maxMs: authBench.max,
    status: authBench.avg < 80 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 5. Portfolio Balance & PnL Lookup
  const [adminUser] = await db.select().from(schema.users).where(eq(schema.users.role, 'ADMIN')).limit(1);
  const portBench = await benchmark('Portfolio Summary Lookup', async () => {
    if (adminUser) {
      await db.select().from(schema.portfolios).where(eq(schema.portfolios.userId, adminUser.id)).limit(1);
    }
  }, 10);
  results.push({
    task: 'Portfolio Balance & PnL Read',
    category: 'Dashboard',
    avgMs: portBench.avg,
    minMs: portBench.min,
    maxMs: portBench.max,
    status: portBench.avg < 30 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 6. Leaderboard Computation (Top 50 Ranking)
  const lbBench = await benchmark('Leaderboard Query (Top 50)', async () => {
    await db.select({
      id: schema.users.id,
      participantId: schema.users.participantId,
      displayName: schema.users.displayName,
      availableCash: schema.portfolios.availableCash,
      realizedPnl: schema.portfolios.realizedPnl,
    })
    .from(schema.users)
    .innerJoin(schema.portfolios, eq(schema.users.id, schema.portfolios.userId))
    .orderBy(desc(schema.portfolios.realizedPnl))
    .limit(50);
  }, 10);
  results.push({
    task: 'Leaderboard Ranking (Top 50)',
    category: 'Leaderboard',
    avgMs: lbBench.avg,
    minMs: lbBench.min,
    maxMs: lbBench.max,
    status: lbBench.avg < 35 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  // 7. Simulated Order Placement Transaction (Validation + Insert)
  const [activeEv] = await db.select().from(schema.events).limit(1);
  const orderBench = await benchmark('Order Insert Transaction', async () => {
    if (adminUser && niftyInst && activeEv) {
      await db.transaction(async (tx) => {
        // Check balance
        await tx.select().from(schema.portfolios).where(eq(schema.portfolios.userId, adminUser.id)).limit(1);
        // Create mock order
        const [ord] = await tx.insert(schema.orders).values({
          publicId: `ord_${Date.now()}_${Math.random()}`,
          clientOrderId: `cli_${Date.now()}_${Math.random()}`,
          idempotencyKey: `idem_${Date.now()}_${Math.random()}`,
          eventId: activeEv.id,
          userId: adminUser.id,
          instrumentId: niftyInst.id,
          side: 'BUY',
          quantity: 1,
          orderType: 'MARKET',
          status: 'PENDING',
        }).returning();
        // Rollback / clean up mock order to keep DB clean
        await tx.delete(schema.orders).where(eq(schema.orders.id, ord.id));
      });
    }
  }, 5);
  results.push({
    task: 'Place Market Order (Tx + Balance Guard)',
    category: 'Trade Execution',
    avgMs: orderBench.avg,
    minMs: orderBench.min,
    maxMs: orderBench.max,
    status: orderBench.avg < 50 ? 'OPTIMAL' : 'ACCEPTABLE',
  });

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

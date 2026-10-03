import { eq, and, lte, desc, asc, sql } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import type { Database } from '../../db/client.js';
import * as schema from '../../db/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import { livePriceCache } from './price-cache.js';

export interface MarketStatusData {
  status: string;
  server_time: string;
  next_change_at: string | null;
  message: string | null;
  event_status: string;
  simulation_day: number | null;
  configured_total_simulation_days: number | null;
  simulation_time: string | null;
}

export interface InstrumentData {
  symbol: string;
  name: string;
  instrument_type: string;
  exchange: string;
  status: string;
  tick_size: string;
  lot_size: number;
}

export interface QuoteData {
  symbol: string;
  last_price: string;
  open_price: string | null;
  high_price: string | null;
  low_price: string | null;
  close_price: string | null;
  change: string | null;
  change_percent: string | null;
  volume: number;
  timestamp: string;
}

export interface CandleData {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  interval_index: number;
  trading_day: number;
}

export class MarketService {
  public constructor(private readonly db: Database) {}

  public async getMarketStatus(): Promise<MarketStatusData> {
    const now = new Date();
    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    if (!activeEvent) {
      return {
        status: 'PRE_OPEN',
        server_time: now.toISOString(),
        next_change_at: null,
        message: 'No active trading event configured.',
        event_status: 'SETUP',
        simulation_day: null,
        configured_total_simulation_days: null,
        simulation_time: null,
      };
    }

    const [simState] = await this.db
      .select()
      .from(schema.simulationStates)
      .where(eq(schema.simulationStates.eventId, activeEvent.id))
      .limit(1);

    const simulationDay = simState?.simulationDay ?? 1;
    const intervalIndex = simState?.intervalIndex ?? 0;

    // Format simulation time: Base 09:15:00 + (intervalIndex * 10) seconds
    const totalSimSeconds = 9 * 3600 + 15 * 60 + intervalIndex * 10;
    const hours = Math.floor(totalSimSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSimSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSimSeconds % 60).toString().padStart(2, '0');
    const simulationTime = `${hours}:${minutes}:${seconds}`;

    return {
      status: simState?.marketStatus ?? 'PRE_OPEN',
      server_time: now.toISOString(),
      next_change_at: null,
      message: null,
      event_status: activeEvent.status,
      simulation_day: activeEvent.status === 'SETUP' ? null : simulationDay,
      configured_total_simulation_days: activeEvent.totalSimulationDays,
      simulation_time: activeEvent.status === 'SETUP' ? null : simulationTime,
    };
  }

  public async getInstruments(): Promise<InstrumentData[]> {
    const rows = await this.db
      .select()
      .from(schema.instruments)
      .orderBy(asc(schema.instruments.symbol));

    return rows.map((inst) => ({
      symbol: inst.symbol,
      name: inst.name,
      instrument_type: inst.instrumentType,
      exchange: inst.exchange,
      status: inst.status,
      tick_size: inst.tickSize,
      lot_size: inst.lotSize,
    }));
  }

  public async getInstrument(symbol: string): Promise<InstrumentData> {
    const [inst] = await this.db
      .select()
      .from(schema.instruments)
      .where(eq(schema.instruments.symbol, symbol.toUpperCase()))
      .limit(1);

    if (!inst) {
      throw new AppError('NOT_FOUND', 404, `Instrument '${symbol}' not found.`);
    }

    return {
      symbol: inst.symbol,
      name: inst.name,
      instrument_type: inst.instrumentType,
      exchange: inst.exchange,
      status: inst.status,
      tick_size: inst.tickSize,
      lot_size: inst.lotSize,
    };
  }

  public async getLatestQuote(symbol: string): Promise<QuoteData> {
    const [inst] = await this.db
      .select()
      .from(schema.instruments)
      .where(eq(schema.instruments.symbol, symbol.toUpperCase()))
      .limit(1);

    if (!inst) {
      throw new AppError('NOT_FOUND', 404, `Instrument '${symbol}' not found.`);
    }

    const cached = livePriceCache.getBySymbol(symbol);
    if (cached) {
      const lastPrice = cached.price;
      const openPrice = cached.open;
      const prevClose = cached.prevClose || cached.open;
      const change = lastPrice.minus(prevClose);
      const changePercent = prevClose.isZero() ? new Decimal(0) : change.dividedBy(prevClose).times(100);
      return {
        symbol: inst.symbol,
        last_price: lastPrice.toFixed(2),
        open_price: openPrice.toFixed(2),
        high_price: cached.high.toFixed(2),
        low_price: cached.low.toFixed(2),
        close_price: lastPrice.toFixed(2),
        change: change.toFixed(2),
        change_percent: changePercent.toFixed(2),
        volume: 0,
        timestamp: cached.timestamp.toISOString(),
      };
    }

    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    const [simState] = activeEvent
      ? await this.db
          .select()
          .from(schema.simulationStates)
          .where(eq(schema.simulationStates.eventId, activeEvent.id))
          .limit(1)
      : [undefined];

    const currentDay = simState?.simulationDay || 1;
    const currentInterval = simState?.intervalIndex || 0;

    // Get latest candle up to current simulation cursor (including Day 0 baseline)
    const [latestCandle] = await this.db
      .select()
      .from(schema.datasetCandles)
      .where(
        and(
          activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
          eq(schema.datasetCandles.instrumentId, inst.id),
          sql`(${schema.datasetCandles.tradingDay} = 0 OR ${schema.datasetCandles.tradingDay} < ${currentDay} OR (${schema.datasetCandles.tradingDay} = ${currentDay} AND ${schema.datasetCandles.intervalIndex} <= ${currentInterval}))`
        )
      )
      .orderBy(desc(schema.datasetCandles.tradingDay), desc(schema.datasetCandles.intervalIndex))
      .limit(1);

    // Fallback if simulation day 1 has no interval yet: fetch candle 0 of day 1 or day 0
    const candle = latestCandle || (await this.db
      .select()
      .from(schema.datasetCandles)
      .where(
        and(
          activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
          eq(schema.datasetCandles.instrumentId, inst.id)
        )
      )
      .orderBy(asc(schema.datasetCandles.tradingDay), asc(schema.datasetCandles.intervalIndex))
      .limit(1))[0];

    if (!candle) {
      throw new AppError('SYSTEM_UNAVAILABLE', 503, `Market data for '${symbol}' is currently unavailable.`);
    }

    // Get day's first candle to calculate open price & change
    const [firstDayCandle] = await this.db
      .select()
      .from(schema.datasetCandles)
      .where(
        and(
          activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
          eq(schema.datasetCandles.instrumentId, inst.id),
          eq(schema.datasetCandles.tradingDay, candle.tradingDay)
        )
      )
      .orderBy(asc(schema.datasetCandles.intervalIndex))
      .limit(1);

    const lastPrice = new Decimal(candle.close);
    const openPrice = firstDayCandle ? new Decimal(firstDayCandle.open) : lastPrice;
    let prevClose = openPrice;
    if (candle.tradingDay >= 1) {
      const [prevCandle] = await this.db
        .select()
        .from(schema.datasetCandles)
        .where(
          and(
            activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
            eq(schema.datasetCandles.instrumentId, inst.id),
            eq(schema.datasetCandles.tradingDay, candle.tradingDay - 1)
          )
        )
        .orderBy(desc(schema.datasetCandles.intervalIndex))
        .limit(1);
      if (prevCandle) {
        prevClose = new Decimal(prevCandle.close);
      }
    }
    const change = lastPrice.minus(prevClose);
    const changePercent = prevClose.isZero() ? new Decimal(0) : change.dividedBy(prevClose).times(100);

    return {
      symbol: inst.symbol,
      last_price: lastPrice.toFixed(2),
      open_price: openPrice.toFixed(2),
      high_price: candle.high,
      low_price: candle.low,
      close_price: lastPrice.toFixed(2),
      change: change.toFixed(2),
      change_percent: changePercent.toFixed(2),
      volume: candle.volume,
      timestamp: (candle.timestamp || new Date()).toISOString(),
    };
  }

  public async getCandles(symbol: string, limit: number = 200): Promise<CandleData[]> {
    const [inst] = await this.db
      .select()
      .from(schema.instruments)
      .where(eq(schema.instruments.symbol, symbol.toUpperCase()))
      .limit(1);

    if (!inst) {
      throw new AppError('NOT_FOUND', 404, `Instrument '${symbol}' not found.`);
    }

    const [activeEvent] = await this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.createdAt))
      .limit(1);

    const [simState] = activeEvent
      ? await this.db
          .select()
          .from(schema.simulationStates)
          .where(eq(schema.simulationStates.eventId, activeEvent.id))
          .limit(1)
      : [undefined];

    const currentDay = simState?.simulationDay || 1;
    const currentInterval = simState?.intervalIndex ?? 0;

    let rows = await this.db
      .select()
      .from(schema.datasetCandles)
      .where(
        and(
          activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
          eq(schema.datasetCandles.instrumentId, inst.id),
          sql`(${schema.datasetCandles.tradingDay} = 0 OR ${schema.datasetCandles.tradingDay} < ${currentDay} OR (${schema.datasetCandles.tradingDay} = ${currentDay} AND ${schema.datasetCandles.intervalIndex} <= ${currentInterval}))`
        )
      )
      .orderBy(desc(schema.datasetCandles.tradingDay), desc(schema.datasetCandles.intervalIndex))
      .limit(limit);

    // Reverse to chronological order (oldest to newest)
    rows = rows.reverse();

    // If simulation hasn't started or is at interval 0 and no rows, return Day 0 or Day 1 candle 0
    if (rows.length === 0) {
      rows = await this.db
        .select()
        .from(schema.datasetCandles)
        .where(
          and(
            activeEvent?.datasetId ? eq(schema.datasetCandles.datasetId, activeEvent.datasetId) : undefined,
            eq(schema.datasetCandles.instrumentId, inst.id),
            sql`${schema.datasetCandles.tradingDay} <= 1`
          )
        )
        .orderBy(asc(schema.datasetCandles.tradingDay), asc(schema.datasetCandles.intervalIndex))
        .limit(72);
    }

    return rows.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
      interval_index: r.intervalIndex,
      trading_day: r.tradingDay,
    }));
  }
}

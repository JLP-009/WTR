import { Decimal } from 'decimal.js';

export interface CachedPrice {
  symbol: string;
  instrumentId: string;
  price: Decimal;
  open: Decimal;
  prevClose: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  timestamp: Date;
}

class PriceCache {
  private readonly pricesBySymbol = new Map<string, CachedPrice>();
  private readonly pricesByInstrumentId = new Map<string, CachedPrice>();

  public setPrice(data: CachedPrice): void {
    this.pricesBySymbol.set(data.symbol.toUpperCase(), data);
    this.pricesByInstrumentId.set(data.instrumentId, data);
  }

  public getBySymbol(symbol: string): CachedPrice | undefined {
    return this.pricesBySymbol.get(symbol.toUpperCase());
  }

  public getByInstrumentId(instrumentId: string): CachedPrice | undefined {
    return this.pricesByInstrumentId.get(instrumentId);
  }

  public getAll(): CachedPrice[] {
    return Array.from(this.pricesBySymbol.values());
  }
}

export const livePriceCache = new PriceCache();

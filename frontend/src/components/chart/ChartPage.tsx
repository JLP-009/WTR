import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { getMarketState, getMarketData } from '../../lib/api/market';
import { getPositions } from '../../lib/api/positions';
import { submitOrder } from '../../lib/api/orders';
import type { MarketState, Timeframe } from '../../contracts/v1/market';
import type { Candle } from '../../contracts/v1/market';
import type { Position } from '../../contracts/v1/positions';
import { TRADABLE_SYMBOLS } from '../../mocks/market';
import ErrorState from '../common/ErrorState';
import { useTheme } from '../../contexts/ThemeContext';
import LWChart from './LWChart';
import FlipWarning from './FlipWarning';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1H', '1D'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n));
}

export default function ChartPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [symbol, setSymbol] = useState(TRADABLE_SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [market, setMarket] = useState<MarketState | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [symbolOpen, setSymbolOpen] = useState(false);
  const symbolDropRef = useRef<HTMLDivElement>(null);

  // order state
  const [positions, setPositions] = useState<Position[]>([]);
  const [orderQty, setOrderQty] = useState('1');
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [pendingOrder, setPendingOrder] = useState<{
    side: 'BUY' | 'SELL';
    qty: number;
    currentPos: Position | null;
    result: 'FLIP' | string;
  } | null>(null);

  const currentPos = positions.find((p) => p.symbol === symbol) ?? null;

  const loadChart = useCallback(async (sym: string, tf: Timeframe) => {
    setLoading(true);
    setError('');
    try {
      const [m, data] = await Promise.all([getMarketState(sym), getMarketData(sym, tf)]);
      setMarket(m);
      setCandles(data.candles);
    } catch {
      setError('Unable to load market data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      setPositions(await getPositions());
    } catch {}
  }, []);

  useEffect(() => {
    loadChart(symbol, timeframe);
    loadPositions();
  }, [symbol, timeframe, loadChart, loadPositions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (symbolDropRef.current && !symbolDropRef.current.contains(e.target as Node)) {
        setSymbolOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOrder = (side: 'BUY' | 'SELL') => {
    const qty = parseInt(orderQty, 10);
    if (!qty || qty <= 0) { setOrderError('Enter a valid quantity'); return; }
    setOrderError('');

    // Flip check
    if (currentPos) {
      const isFlip =
        (side === 'SELL' && currentPos.side === 'LONG' && qty > currentPos.quantity) ||
        (side === 'BUY' && currentPos.side === 'SHORT' && qty > currentPos.quantity);
      if (isFlip) {
        setPendingOrder({ side, qty, currentPos, result: 'FLIP' });
        return;
      }
    }
    executeOrder(side, qty);
  };

  const executeOrder = async (side: 'BUY' | 'SELL', qty: number) => {
    setOrderError('');
    setOrderSuccess('');
    try {
      const res = await submitOrder({ symbol, side, quantity: qty });
      if (res.status === 'ACCEPTED') {
        setOrderSuccess(res.message);
        setTimeout(() => setOrderSuccess(''), 3000);
        loadPositions();
      } else {
        setOrderError(res.message);
      }
    } catch {
      setOrderError('Order failed');
    }
  };

  const handleClose = async () => {
    if (!currentPos) return;
    const side = currentPos.side === 'LONG' ? 'SELL' : 'BUY';
    await executeOrder(side, currentPos.quantity);
  };

  const confirmFlip = () => {
    if (!pendingOrder) return;
    setPendingOrder(null);
    executeOrder(pendingOrder.side, pendingOrder.qty);
  };

  return (
    <div className="flex flex-col gap-3 -mt-1">
      {/* Market header */}
      {market && (
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[11px] font-medium tracking-widest uppercase text-[color:var(--foreground-muted)]">
              {market.symbol}
            </h2>
            <p className="text-2xl font-bold tabular-nums text-[color:var(--foreground)] leading-tight mt-0.5">
              ₹{fmt(market.ltp)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold tabular-nums ${market.changePct >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
              {market.changePct >= 0 ? '+' : ''}{market.changePct.toFixed(2)}%
            </p>
            <p className={`text-xs tabular-nums ${market.changePct >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
              {market.change >= 0 ? '+' : ''}₹{fmt(market.change)}
            </p>
          </div>
        </div>
      )}

      {/* Symbol selector */}
      <div className="relative" ref={symbolDropRef}>
        <button
          onClick={() => setSymbolOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={symbolOpen}
          aria-label="Select symbol"
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] transition-colors"
        >
          <span className="text-sm font-semibold text-[color:var(--foreground)] tracking-wide">{symbol}</span>
          <ChevronDown
            size={14}
            className={`text-[color:var(--foreground-muted)] transition-transform ${symbolOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {symbolOpen && (
          <div
            role="listbox"
            aria-label="Tradable symbols"
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-[color:var(--surface-elevated)] border border-[color:var(--border)] rounded-xl shadow-lg overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto">
              {TRADABLE_SYMBOLS.map((s) => (
                <button
                  key={s}
                  role="option"
                  aria-selected={s === symbol}
                  onClick={() => { setSymbol(s); setSymbolOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    s === symbol
                      ? 'bg-[color:var(--surface-muted)] text-[color:var(--accent)] font-semibold'
                      : 'text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeframes */}
      <div className="flex gap-1" role="tablist" aria-label="Timeframe">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            role="tab"
            aria-selected={timeframe === tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timeframe === tf
                ? 'bg-[color:var(--accent)] text-[color:var(--background)]'
                : 'text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground-secondary)]'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      {error ? (
        <ErrorState message={error} onRetry={() => loadChart(symbol, timeframe)} />
      ) : loading ? (
        <div className="h-64 rounded-xl bg-[color:var(--surface-muted)] animate-pulse" />
      ) : (
        <div className="h-[260px] rounded-xl overflow-hidden border border-[color:var(--border)]">
          <LWChart candles={candles} isDark={isDark} />
        </div>
      )}

      {/* Current position context */}
      {currentPos && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-full border border-[color:var(--border-strong)] text-[color:var(--foreground-secondary)]">
              {currentPos.side}
            </span>
            <span className="text-xs text-[color:var(--foreground-secondary)]">
              {currentPos.quantity} qty
            </span>
          </div>
          <span className={`text-xs font-semibold tabular-nums ${currentPos.pnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
            {currentPos.pnl >= 0 ? '+' : '−'}₹{fmt(currentPos.pnl)}
          </span>
        </div>
      )}

      {/* Order panel */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={orderQty}
            onChange={(e) => setOrderQty(e.target.value)}
            aria-label="Order quantity"
            placeholder="Qty"
            className="w-20 h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] text-sm font-mono tabular-nums text-[color:var(--foreground)] focus:outline-none focus:border-[color:var(--accent)] transition-colors"
          />
          {market && (
            <span className="text-xs text-[color:var(--foreground-muted)]">
              ≈ ₹{fmt(parseFloat(orderQty || '0') * market.ltp)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleOrder('BUY')}
            className="flex-1 h-9 rounded-lg text-xs font-semibold tracking-wider uppercase border border-[color:var(--border-strong)] text-[color:var(--foreground-secondary)] hover:border-[color:var(--success)] hover:text-[color:var(--success)] transition-colors"
          >
            Buy
          </button>
          <button
            onClick={() => handleOrder('SELL')}
            className="flex-1 h-9 rounded-lg text-xs font-semibold tracking-wider uppercase border border-[color:var(--border-strong)] text-[color:var(--foreground-secondary)] hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] transition-colors"
          >
            Sell
          </button>
          {currentPos && (
            <button
              onClick={handleClose}
              aria-label={`Close ${currentPos.side} position`}
              className="flex-1 h-9 rounded-lg text-xs font-semibold tracking-wider uppercase border border-[color:var(--border-strong)] text-[color:var(--foreground-muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors"
            >
              Close
            </button>
          )}
        </div>
        {orderError && <p role="alert" className="text-[11px] text-[color:var(--danger)]">{orderError}</p>}
        {orderSuccess && <p role="status" className="text-[11px] text-[color:var(--success)]">{orderSuccess}</p>}
      </div>

      {/* Flip warning modal */}
      {pendingOrder && (
        <FlipWarning
          side={pendingOrder.side}
          qty={pendingOrder.qty}
          currentPos={pendingOrder.currentPos}
          onConfirm={confirmFlip}
          onCancel={() => setPendingOrder(null)}
        />
      )}
    </div>
  );
}

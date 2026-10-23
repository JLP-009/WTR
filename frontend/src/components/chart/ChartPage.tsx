import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { api } from '../../lib/api/client';
import { getMarketState, getMarketData } from '../../lib/api/market';
import { getPositions } from '../../lib/api/positions';
import { submitOrder } from '../../lib/api/orders';
import { getPortfolioSummary, normalizePortfolioSummary } from '../../lib/api/portfolio';
import type { MarketState } from '../../contracts/v1/market';
import type { Candle } from '../../contracts/v1/market';
import type { Position } from '../../contracts/v1/positions';
import { TRADABLE_SYMBOLS } from '../../mocks/market';
import { wsClient } from '../../lib/websocket';
import ErrorState from '../common/ErrorState';
import { useTheme } from '../../contexts/ThemeContext';
import LWChart from './LWChart';
import FlipWarning from './FlipWarning';
import ConfirmDialog from '../common/ConfirmDialog';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
}

export default function ChartPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [tradableSymbols, setTradableSymbols] = useState<string[]>(TRADABLE_SYMBOLS);
  const [symbol, setSymbol] = useState(TRADABLE_SYMBOLS[0]);
  const [market, setMarket] = useState<MarketState | null>(null);
  const [marketStatus, setMarketStatus] = useState<string>('OPEN');
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
  const [confirmOrder, setConfirmOrder] = useState<{
    side: 'BUY' | 'SELL';
    qty: number;
    estValue: number;
  } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const currentPos = positions.find((p) => p.symbol === symbol) ?? null;

  useEffect(() => {
    // Initial market status and instruments list check
    api.get<{ status: string }>('/market/status')
      .then((res) => {
        if (res && res.status) setMarketStatus(res.status);
      })
      .catch(() => {});

    api.get<Array<{ symbol: string }>>('/market/instruments')
      .then((instruments) => {
        if (Array.isArray(instruments) && instruments.length > 0) {
          const syms = instruments.map((i) => i.symbol);
          setTradableSymbols(syms);
          setSymbol((prev) => (syms.includes(prev) ? prev : syms[0]));
        }
      })
      .catch(() => {});

    const unsubStatus = wsClient.subscribe('market_status', (data: any) => {
      if (data && data.status) {
        setMarketStatus(data.status);
      }
    });

    return () => unsubStatus();
  }, []);

  const loadChart = useCallback(async (sym: string) => {
    setLoading(true);
    setError('');
    try {
      const [m, data] = await Promise.all([getMarketState(sym), getMarketData(sym)]);
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
    loadChart(symbol);
    loadPositions();
  }, [symbol, loadChart, loadPositions]);

  // Real-time market tick & portfolio subscriptions
  useEffect(() => {
    const unsubMarket = wsClient.subscribe('market', (tick: any) => {
      if (tick && tick.symbol === symbol) {
        const ltp = parseFloat(tick.last_price ?? tick.ltp ?? tick.close_price);
        const change = parseFloat(tick.change ?? '0');
        const changePct = parseFloat(tick.change_percent ?? tick.changePct ?? '0');
        if (!isNaN(ltp)) {
          setMarket({
            symbol,
            status: 'LIVE',
            ltp,
            change,
            changePct,
          });

          if (tick.timestamp && tick.open_price) {
            const timeSec = Math.floor(new Date(tick.timestamp).getTime() / 1000);
            const candleObj = {
              time: timeSec,
              open: parseFloat(tick.open_price),
              high: parseFloat(tick.high_price || tick.open_price),
              low: parseFloat(tick.low_price || tick.open_price),
              close: parseFloat(tick.close_price || tick.last_price),
              volume: tick.volume ? parseInt(tick.volume, 10) : 0,
            };
            setCandles((prev) => {
              if (!prev || prev.length === 0) {
                return [candleObj];
              }
              const lastCandle = prev[prev.length - 1];
              if (lastCandle.time === timeSec) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...lastCandle,
                  high: Math.max(lastCandle.high, candleObj.high),
                  low: Math.min(lastCandle.low, candleObj.low),
                  close: candleObj.close,
                  volume: candleObj.volume,
                };
                return updated;
              } else if (timeSec > lastCandle.time) {
                return [...prev, candleObj];
              }
              return prev;
            });
          }
        }
      }
    });

    const unsubOrders = wsClient.subscribe('orders', () => {
      loadPositions();
    });

    return () => {
      unsubMarket();
      unsubOrders();
    };
  }, [symbol, loadPositions]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCash, setAvailableCash] = useState<number | null>(null);

  const loadPortfolio = useCallback(async () => {
    try {
      const p = await getPortfolioSummary();
      if (p && typeof p.availableCash === 'number') {
        setAvailableCash(p.availableCash);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadPortfolio();
    const unsubPort = wsClient.subscribe('portfolio', (payload: any) => {
      const data = payload?.data || payload;
      if (data) {
        const norm = normalizePortfolioSummary(data);
        setAvailableCash(norm.availableCash);
      } else {
        loadPortfolio();
      }
    });
    const unsubOrders = wsClient.subscribe('orders', () => {
      loadPortfolio();
    });
    return () => {
      unsubPort();
      unsubOrders();
    };
  }, [loadPortfolio]);

  const handleOrder = (side: 'BUY' | 'SELL') => {
    if (isSubmitting) return;
    const qty = parseInt(orderQty, 10);
    if (!qty || qty <= 0) { setOrderError('Enter a valid quantity'); return; }
    setOrderError('');

    // Flip check
    if (currentPos && currentPos.quantity > 0) {
      const isFlip =
        (side === 'SELL' && currentPos.side === 'LONG' && qty > currentPos.quantity) ||
        (side === 'BUY' && currentPos.side === 'SHORT' && qty > currentPos.quantity);
      if (isFlip) {
        setPendingOrder({ side, qty, currentPos, result: 'FLIP' });
        return;
      }
    }
    const est = market ? qty * market.ltp : 0;
    setConfirmOrder({ side, qty, estValue: est });
  };

  const confirmTradeOrder = () => {
    if (!confirmOrder) return;
    const { side, qty } = confirmOrder;
    setConfirmOrder(null);
    executeOrder(side, qty);
  };

  const executeOrder = async (side: 'BUY' | 'SELL', qty: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOrderError('');
    setOrderSuccess('');
    try {
      const res = await submitOrder({ symbol, side, quantity: qty });
      if (res.status === 'ACCEPTED') {
        setOrderSuccess(res.message);
        setOrderQty('1');
        setTimeout(() => setOrderSuccess(''), 3000);
        // Refresh positions in background without blocking UI
        loadPositions();
      } else {
        setOrderError(res.message);
      }
    } catch {
      setOrderError('Order failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!currentPos || currentPos.quantity <= 0) return;
    setShowCloseConfirm(true);
  };

  const confirmClosePosition = async () => {
    if (!currentPos || currentPos.quantity <= 0) return;
    const closedSymbol = symbol;
    const closedQty = currentPos.quantity;
    setShowCloseConfirm(false);
    setIsSubmitting(true);
    setOrderError('');
    setOrderSuccess('');

    try {
      const res = await submitOrder({ symbol: closedSymbol, side: 'CLOSE', quantity: closedQty });
      if (res.status === 'ACCEPTED') {
        setOrderSuccess(`Position for ${closedSymbol} closed successfully.`);
        setOrderQty('1');
        setTimeout(() => setOrderSuccess(''), 4000);
        // Clear closed position from local state
        setPositions((prev) => prev.filter((p) => p.symbol !== closedSymbol));
        loadPositions();
      } else {
        setOrderError(res.message || 'Failed to close position.');
      }
    } catch (err: any) {
      setOrderError(err?.message || 'Failed to close position. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmFlip = () => {
    if (!pendingOrder) return;
    setPendingOrder(null);
    executeOrder(pendingOrder.side, pendingOrder.qty);
  };

  const currentEntryPrice = currentPos ? (currentPos.avgPrice || (currentPos as any).average_entry_price || (currentPos as any).entry_price || 0) : 0;
  const positionForChart = currentPos && currentPos.quantity > 0 && Number(currentEntryPrice) > 0 ? {
    side: currentPos.side,
    entryPrice: Number(currentEntryPrice),
    quantity: currentPos.quantity,
  } : null;

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
              {market.changePct >= 0 ? '+' : '−'}{Math.abs(market.changePct).toFixed(2)}%
            </p>
            <p className={`text-xs font-medium tabular-nums ${market.change >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
              {market.change >= 0 ? '+' : '−'}₹{fmt(market.change)}
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
              {tradableSymbols.map((s) => (
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

      {/* Chart */}
      {error ? (
        <ErrorState message={error} onRetry={() => loadChart(symbol)} />
      ) : loading ? (
        <div className="h-64 rounded-xl bg-[color:var(--surface-muted)] animate-pulse" />
      ) : (
        <div className="h-[260px] rounded-xl overflow-hidden border border-[color:var(--border)]">
          <LWChart
            candles={candles}
            isDark={isDark}
            position={positionForChart}
          />
        </div>
      )}

      {/* Current position context */}
      {currentPos && currentPos.quantity > 0 && (() => {
        const entryPrice = currentEntryPrice;
        const qty = currentPos.quantity;
        const livePnl = market && !isNaN(market.ltp) && entryPrice > 0
          ? (currentPos.side === 'LONG' ? (market.ltp - entryPrice) * qty : (entryPrice - market.ltp) * qty)
          : (currentPos.pnl || 0);

        return (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md ${
                currentPos.side === 'LONG' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              }`}>
                {currentPos.side}
              </span>
              <span className="text-xs font-semibold text-[color:var(--foreground-secondary)]">
                {qty} qty
              </span>
              {entryPrice > 0 && (
                <span className="text-[11px] text-[color:var(--foreground-muted)] hidden sm:inline">
                  @ ₹{fmt(entryPrice)}
                </span>
              )}
            </div>
            <span className={`text-xs font-bold tabular-nums ${livePnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
              {livePnl >= 0 ? '+' : '−'}₹{fmt(livePnl)}
            </span>
          </div>
        );
      })()}

      {/* Market Status Lock Warning */}
      {marketStatus !== 'OPEN' && (
        <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
          marketStatus === 'HALTED' ? 'bg-[color:var(--danger)]/15 border-[color:var(--danger)] text-[color:var(--danger)] animate-pulse' :
          marketStatus === 'PAUSED' ? 'bg-[color:var(--warning)]/15 border-[color:var(--warning)] text-[color:var(--warning)]' :
          'bg-[color:var(--surface-muted)] border-[color:var(--border)] text-[color:var(--foreground-muted)]'
        }`}>
          <span>⚠️ MARKET {marketStatus} — ORDERS LOCKED</span>
        </div>
      )}

      {/* Order panel */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 shadow-sm w-full min-w-0 overflow-hidden">
        {/* Quantity Section: Label -> Input Box -> Estimated Value */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="order-quantity-input" className="text-xs font-bold uppercase tracking-wider text-[color:var(--foreground-secondary)]">
              Quantity
            </label>
            <span className="text-[11px] font-medium text-[color:var(--foreground-muted)]">
              Units
            </span>
          </div>

          {/* Quantity Stepper & Input Box */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
            <button
              type="button"
              disabled={marketStatus !== 'OPEN' || parseInt(orderQty || '1', 10) <= 1}
              onClick={() => setOrderQty((prev) => Math.max(1, (parseInt(prev || '1', 10) - 1)).toString())}
              className="w-10 sm:w-11 h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)] font-bold text-lg hover:bg-[color:var(--surface-elevated)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 select-none"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <div className="flex-1 min-w-0 relative">
              <input
                id="order-quantity-input"
                type="number"
                min="1"
                disabled={marketStatus !== 'OPEN'}
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                aria-label="Order quantity"
                placeholder="1"
                className="w-full min-w-0 h-11 px-2 text-center rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--background)] text-base font-mono font-bold tabular-nums text-[color:var(--foreground)] focus:outline-none focus:border-[color:var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              type="button"
              disabled={marketStatus !== 'OPEN'}
              onClick={() => setOrderQty((prev) => (parseInt(prev || '0', 10) + 1).toString())}
              className="w-10 sm:w-11 h-11 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)] font-bold text-lg hover:bg-[color:var(--surface-elevated)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 select-none"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Quick Quantity Presets */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5 w-full min-w-0">
            {[1, 5, 10, 25, 50].map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={marketStatus !== 'OPEN'}
                onClick={() => setOrderQty(preset.toString())}
                className={`h-7 text-xs font-mono font-semibold rounded-lg border transition-all flex items-center justify-center ${
                  orderQty === preset.toString()
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--accent)] font-bold shadow-xs'
                    : 'border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Estimated Value & Available Cash Summary */}
          <div className="rounded-xl bg-[color:var(--surface-muted)]/50 border border-[color:var(--border)] divide-y divide-[color:var(--border)]/60 w-full min-w-0">
            <div className="flex items-center justify-between px-3.5 py-2">
              <span className="text-xs text-[color:var(--foreground-muted)] font-medium">
                Estimated Value
              </span>
              <span className="text-xs font-mono font-bold tabular-nums text-[color:var(--foreground)] truncate ml-2">
                {market ? `₹${fmt(parseFloat(orderQty || '0') * market.ltp)}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2">
              <div className="flex items-center gap-1.5">
                <Wallet size={13} className="text-[color:var(--accent)] shrink-0" />
                <span className="text-xs text-[color:var(--foreground-muted)] font-medium">
                  Available Cash
                </span>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums text-[color:var(--foreground)] truncate ml-2">
                {availableCash !== null ? `₹${fmt(availableCash)}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Solid Green Buy, Solid Red Sell */}
        <div className="flex items-center gap-2 sm:gap-3 pt-1 w-full min-w-0">
          <button
            disabled={marketStatus !== 'OPEN' || isSubmitting}
            onClick={() => handleOrder('BUY')}
            className="flex-1 min-w-0 h-11 rounded-xl text-xs font-black tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-md hover:shadow-emerald-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-1.5"
          >
            <span>{isSubmitting ? '...' : 'Buy'}</span>
          </button>
          <button
            disabled={marketStatus !== 'OPEN' || isSubmitting}
            onClick={() => handleOrder('SELL')}
            className="flex-1 min-w-0 h-11 rounded-xl text-xs font-black tracking-widest uppercase bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white shadow-md hover:shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-1.5"
          >
            <span>{isSubmitting ? '...' : 'Sell'}</span>
          </button>
          {currentPos && (
            <button
              disabled={marketStatus !== 'OPEN'}
              onClick={handleClose}
              aria-label={`Close ${currentPos.side} position`}
              className="px-3 sm:px-4 h-11 rounded-xl text-xs font-bold tracking-wider uppercase border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Close
            </button>
          )}
        </div>

        {orderError && (
          <div className="p-2.5 rounded-lg bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-medium text-[color:var(--danger)] text-center">
            {orderError}
          </div>
        )}
        {orderSuccess && (
          <div className="p-2.5 rounded-lg bg-[color:var(--success)]/10 border border-[color:var(--success)]/30 text-xs font-medium text-[color:var(--success)] text-center">
            {orderSuccess}
          </div>
        )}
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

      {/* Trade Order Confirmation Dialog */}
      {confirmOrder && (
        <ConfirmDialog
          open={!!confirmOrder}
          onClose={() => setConfirmOrder(null)}
          onConfirm={confirmTradeOrder}
          title={`Confirm ${confirmOrder.side} Order?`}
          description={`Place a MARKET ${confirmOrder.side} order for ${confirmOrder.qty} share(s) of ${symbol} at ~₹${fmt(market?.ltp ?? 0)} (Estimated Value: ₹${fmt(confirmOrder.estValue)})?`}
          confirmLabel={isSubmitting ? 'Placing…' : `Confirm ${confirmOrder.side}`}
          variant={confirmOrder.side === 'BUY' ? 'success' : 'danger'}
          loading={isSubmitting}
        />
      )}

      {/* Close Position Confirmation Dialog */}
      {currentPos && (
        <ConfirmDialog
          open={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={confirmClosePosition}
          title={`Close ${symbol} Position?`}
          description={`Are you sure you want to close your ${currentPos.side} position of ${currentPos.quantity} shares of ${symbol} at current market price (₹${fmt(market?.ltp ?? 0)})?`}
          confirmLabel={isSubmitting ? 'Closing…' : 'Close Position'}
          destructive={true}
          loading={isSubmitting}
        />
      )}
    </div>
  );
}

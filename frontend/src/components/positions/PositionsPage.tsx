import { useEffect, useState } from 'react';
import { Briefcase, History, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { getPositions, closePosition } from '../../lib/api/positions';
import { getOrders } from '../../lib/api/orders';
import { wsClient } from '../../lib/websocket';
import type { Position } from '../../contracts/v1/positions';
import type { TradeHistoryItem } from '../../contracts/v1/orders';
import PositionCard from './PositionCard';
import { SkeletonCard } from '../common/LoadingState';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n || 0));
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function PositionsPage() {
  const [activeTab, setActiveTab] = useState<'positions' | 'trades'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadPositions = async () => {
    try {
      const data = await getPositions();
      setPositions(data);
    } catch {
      setError('Unable to load positions');
    }
  };

  const loadTrades = async () => {
    setTradesLoading(true);
    try {
      const list = await getOrders(100);
      setTrades(list);
    } catch {
      // ignore
    } finally {
      setTradesLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    await Promise.all([loadPositions(), loadTrades()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const unsubOrder = wsClient.subscribe('orders', () => {
      loadPositions();
      loadTrades();
    });
    const unsubPos = wsClient.subscribe('positions', () => {
      loadPositions();
    });
    const unsubMarket = wsClient.subscribe('market', (tick: any) => {
      const data = tick?.data || tick;
      if (!data?.symbol || !data?.last_price) return;
      const latestPrice = parseFloat(data.last_price);
      if (isNaN(latestPrice)) return;

      setPositions((prev) =>
        prev.map((pos) => {
          if (pos.symbol.toUpperCase() === data.symbol.toUpperCase()) {
            const entry = pos.avgPrice ?? 0;
            const qty = pos.quantity ?? 0;
            let unrealized = 0;
            if (pos.side === 'LONG') {
              unrealized = (latestPrice - entry) * qty;
            } else if (pos.side === 'SHORT') {
              unrealized = (entry - latestPrice) * qty;
            }
            const invested = entry * qty;
            const pnlPct = invested > 0 ? (unrealized / invested) * 100 : 0;
            return {
              ...pos,
              ltp: latestPrice,
              pnl: parseFloat(unrealized.toFixed(2)),
              pnlPct: parseFloat(pnlPct.toFixed(2)),
            };
          }
          return pos;
        })
      );
    });

    return () => {
      unsubOrder();
      unsubPos();
      unsubMarket();
    };
  }, []);

  const handleClosed = async (id: string, symbol?: string) => {
    const targetPos = positions.find((p) => p.id === id);
    const targetSymbol = symbol || targetPos?.symbol || 'Position';
    setActionError('');

    try {
      const res = await closePosition({ positionId: id });
      if (!res.success) {
        setActionError(res.message || 'Failed to close position.');
      } else {
        setPositions((prev) => prev.filter((p) => p.id !== id));
        setSuccessMessage(`Position for ${targetSymbol} closed successfully.`);
        setTimeout(() => setSuccessMessage(''), 4000);
        loadTrades();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to close position.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Tab Switcher */}
      <div className="w-full min-w-0">
        <div className="grid grid-cols-2 p-1 bg-[color:var(--surface-muted)] rounded-xl border border-[color:var(--border)] w-full min-w-0">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all min-w-0 ${
              activeTab === 'positions'
                ? 'bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-xs'
                : 'text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]'
            }`}
          >
            <Briefcase size={13} className="shrink-0" />
            <span className="truncate">Open Positions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
              activeTab === 'positions' ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--border)] text-[color:var(--foreground-muted)]'
            }`}>
              {positions.length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('trades'); loadTrades(); }}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all min-w-0 ${
              activeTab === 'trades'
                ? 'bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-xs'
                : 'text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]'
            }`}
          >
            <History size={13} className="shrink-0" />
            <span className="truncate">Previous Trades</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
              activeTab === 'trades' ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--border)] text-[color:var(--foreground-muted)]'
            }`}>
              {trades.length}
            </span>
          </button>
        </div>
      </div>

      {/* Confirmation & Notification Banners */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[color:var(--success)]/10 border border-[color:var(--success)]/30 text-xs font-semibold text-[color:var(--success)] animate-in fade-in duration-150">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {actionError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs font-semibold text-[color:var(--danger)] animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError('')}
            className="p-1 rounded-md hover:bg-black/10 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadAll} />
      ) : activeTab === 'positions' ? (
        positions.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={28} />}
            title="No open positions"
            description="Your open positions will appear here once you enter the market."
          />
        ) : (
          <div className="space-y-3">
            {positions.map((p) => (
              <PositionCard key={p.id} position={p} onClosed={handleClosed} />
            ))}
          </div>
        )
      ) : (
        /* Previous Trades Tab */
        tradesLoading && trades.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
          </div>
        ) : trades.length === 0 ? (
          <EmptyState
            icon={<History size={28} />}
            title="No previous trades"
            description="All your executed market orders will be recorded here."
          />
        ) : (
          <div className="space-y-2.5">
            {trades.map((t) => {
              const isBuy = t.side === 'BUY';
              const price = t.average_price ? parseFloat(t.average_price) : 0;
              const totalVal = price * (t.filled_quantity || t.quantity);

              return (
                <div
                  key={t.order_id}
                  className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[color:var(--foreground)] tracking-wide">
                        {t.symbol}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {isBuy ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {t.side}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} />
                      <span className="uppercase tracking-wider">{t.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[color:var(--border)]/60 text-xs">
                    <div>
                      <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Qty</p>
                      <p className="font-semibold text-[color:var(--foreground)] tabular-nums mt-0.5">
                        {t.filled_quantity || t.quantity} shares
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Price</p>
                      <p className="font-semibold text-[color:var(--foreground)] tabular-nums mt-0.5">
                        ₹{fmt(price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Value</p>
                      <p className="font-semibold text-[color:var(--foreground)] tabular-nums mt-0.5">
                        ₹{fmt(totalVal)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5 text-[10px] text-[color:var(--foreground-muted)]">
                    <span>Order: {t.order_id.slice(0, 12)}…</span>
                    <span>{formatDate(t.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

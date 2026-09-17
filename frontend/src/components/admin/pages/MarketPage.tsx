import { useEffect, useState, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import {
  getAdminMarket, getAdminEvent,
  openMarketAdmin, pauseMarketAdmin, resumeMarketAdmin, haltMarketAdmin, closeMarketAdmin,
  generateIdempotencyKey, AdminApiError,
} from '../../../lib/api/admin';
import type { AdminMarketState, AdminEventState } from '../../../types/admin';

type MarketAction = 'open' | 'pause' | 'resume' | 'halt' | 'close' | null;

const fmt = (v: string) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(v));

function PriceRow({ symbol, price, prev }: { symbol: string; price: string; prev?: string }) {
  const curr = parseFloat(price);
  const p = prev ? parseFloat(prev) : curr;
  const diff = curr - p;
  const pct = p !== 0 ? (diff / p) * 100 : 0;
  const up = diff > 0;
  const dn = diff < 0;
  return (
    <tr className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)] transition-colors">
      <td className="px-4 py-3 font-mono text-xs font-semibold text-[color:var(--foreground)]">{symbol}</td>
      <td className="px-4 py-3 text-right tabular-nums text-xs font-medium text-[color:var(--foreground)]">
        ₹{fmt(price)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-xs">
        <span className={up ? 'text-[color:var(--success)]' : dn ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-muted)]'}>
          {up ? '+' : ''}{fmt(String(diff))}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-xs">
        <span className={`inline-flex items-center gap-1 ${up ? 'text-[color:var(--success)]' : dn ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-muted)]'}`}>
          {up ? <TrendingUp size={11} /> : dn ? <TrendingDown size={11} /> : <Minus size={11} />}
          {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
        </span>
      </td>
    </tr>
  );
}

export default function MarketPage() {
  const [market, setMarket] = useState<AdminMarketState | null>(null);
  const [event, setEvent] = useState<AdminEventState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<MarketAction>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const idk = useRef<Record<string, string>>({});
  const getIdk = (op: string) => { if (!idk.current[op]) idk.current[op] = generateIdempotencyKey(); return idk.current[op]; };
  const resetIdk = (op: string) => { delete idk.current[op]; };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [m, e] = await Promise.all([getAdminMarket(), getAdminEvent()]);
      setMarket(m); setEvent(e);
    } catch { setError('Unable to load market state'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (op: MarketAction) => {
    if (!op) return;
    setActionLoading(true); setActionError('');
    try {
      const key = getIdk(op);
      let result: AdminMarketState | undefined;
      if (op === 'open')   result = await openMarketAdmin(key);
      if (op === 'pause')  result = await pauseMarketAdmin(key);
      if (op === 'resume') result = await resumeMarketAdmin(key);
      if (op === 'halt')   result = await haltMarketAdmin(key);
      if (op === 'close')  result = await closeMarketAdmin(key);
      if (result) setMarket(result);
      resetIdk(op);
      setDialog(null);
    } catch (e) {
      const msg = e instanceof AdminApiError ? e.userMessage : 'Operation failed.';
      setActionError(msg);
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  const m = market!;
  const ms = m.market_status;
  // §5.2 Open Market: market_status = PRE_OPEN AND event_status = RUNNING (contract §5.2)
  const canOpen   = ms === 'PRE_OPEN' && event?.event_status === 'RUNNING';
  const canPause  = ms === 'OPEN';
  const canResume = ms === 'PAUSED' || ms === 'HALTED';
  const canHalt   = ms === 'OPEN';
  // §5.6 Close Market — valid from OPEN or HALTED; triggers day-close sequence
  const canClose  = ms === 'OPEN' || ms === 'HALTED';
  const symbols = Object.entries(m.last_committed_close_by_symbol);

  const ACTIONS: { op: MarketAction; label: string; enabled: boolean; className: string }[] = [
    { op: 'open',   label: 'Open Market',   enabled: canOpen,   className: 'text-[color:var(--success)] bg-[color:var(--success)]/8 border-[color:var(--success)]/25 hover:bg-[color:var(--success)]/15' },
    { op: 'pause',  label: 'Pause Market',  enabled: canPause,  className: 'text-[color:var(--warning)] bg-[color:var(--warning)]/8 border-[color:var(--warning)]/25 hover:bg-[color:var(--warning)]/15' },
    { op: 'resume', label: 'Resume Market', enabled: canResume, className: 'text-[color:var(--accent)] bg-[color:var(--accent)]/8 border-[color:var(--accent)]/25 hover:bg-[color:var(--accent)]/15' },
    { op: 'halt',   label: 'Halt Market',   enabled: canHalt,   className: 'text-[color:var(--danger)] bg-[color:var(--danger)]/8 border-[color:var(--danger)]/25 hover:bg-[color:var(--danger)]/15' },
    { op: 'close',  label: 'Close Market',  enabled: canClose,  className: 'text-[color:var(--danger)] bg-[color:var(--danger)]/8 border-[color:var(--danger)]/25 hover:bg-[color:var(--danger)]/15' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Market</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Market status and price monitor</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {actionError && (
        <div className="px-4 py-3 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/20 text-sm text-[color:var(--danger)]">{actionError}</div>
      )}

      {/* Status strip */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
            {[
              { label: 'Market Status', value: <StatusBadge status={ms} size="md" /> },
              { label: 'Day Status',    value: <StatusBadge status={m.day_status} size="md" /> },
              { label: 'Sim Time',      value: <span className="font-mono text-sm">{m.simulation_time}</span> },
              { label: 'Last Commit',   value: <span className="text-xs">{new Date(m.last_committed_at).toLocaleTimeString()}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                <div className="text-sm font-medium text-[color:var(--foreground)]">{value}</div>
              </div>
            ))}
          </div>
          {event && (
            <div className="text-right">
              <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-widest">Event</p>
              <p className="text-xs font-medium text-[color:var(--foreground-secondary)] mt-0.5">
                Day {event.simulation_day}/{event.configured_total_simulation_days}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Market controls */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">Market Controls</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ACTIONS.map(({ op, label, enabled, className }) => (
            <button
              key={op}
              onClick={() => { setActionError(''); setDialog(op); }}
              disabled={!enabled}
              className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
        {ms === 'HALTED' && (
          <p className="mt-3 text-xs text-[color:var(--warning)] text-center">
            Market is halted. Simulation is paused but participant orders are not rejected. Use Resume to continue.
          </p>
        )}
      </div>

      {/* Price table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">
            Last Committed Prices ({symbols.length} symbols)
          </p>
          <span className="text-[10px] text-[color:var(--foreground-muted)]">
            Source: authoritative backend — not computed by frontend
          </span>
        </div>
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[360px]">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Symbol', 'Last Close', 'Change', '% Change'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${i > 0 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map(([sym, price]) => (
                  <PriceRow key={sym} symbol={sym} price={price} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog open={dialog === 'open'}   onClose={() => setDialog(null)} onConfirm={() => runAction('open')}   title="Open Market?" description="Opens the market for today's session. Participants will be able to submit orders." confirmLabel="Open Market" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'pause'}  onClose={() => setDialog(null)} onConfirm={() => runAction('pause')}  title="Pause Market?" description="Temporarily pauses market activity. Participant orders will be queued." confirmLabel="Pause Market" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'resume'} onClose={() => setDialog(null)} onConfirm={() => runAction('resume')} title="Resume Market?" description="Resumes market activity from the current state." confirmLabel="Resume Market" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'halt'}   onClose={() => setDialog(null)} onConfirm={() => runAction('halt')}   title="Halt Market?" description="Immediately halts simulation progression. Does NOT reject participant orders — they will be queued until the market resumes." confirmLabel="Halt Market" destructive loading={actionLoading} />
      <ConfirmDialog open={dialog === 'close'}  onClose={() => setDialog(null)} onConfirm={() => runAction('close')}  title="Close Market?" description="This is a terminal day operation. Closing the market triggers the full day-close sequence — simulation halts, closing prices are committed, and a leaderboard snapshot is taken. This cannot be undone. Do not confuse with Halt (which is temporary)." confirmLabel="Close Market" cancelLabel="Keep Open" destructive loading={actionLoading} />
    </div>
  );
}

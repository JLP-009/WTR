import { useEffect, useState } from 'react';
import { Search, RefreshCw, Briefcase } from 'lucide-react';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminPositionsMonitor } from '../../../lib/api/admin';
import type { AdminPosition } from '../../../types/admin';

const fmtCur = (s: string) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s));

const pnlColor = (v: string) => {
  const n = parseFloat(v);
  return n > 0 ? 'text-[color:var(--success)]' : n < 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]';
};

const pnlPrefix = (v: string) => parseFloat(v) > 0 ? '+' : '';

export default function PositionsPage() {
  const [all, setAll] = useState<AdminPosition[]>([]);
  const [filtered, setFiltered] = useState<AdminPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getAdminPositionsMonitor(); setAll(r.data); }
    catch { setError('Unable to load positions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...all];
    if (search) r = r.filter(p =>
      p.participant_display_name.toLowerCase().includes(search.toLowerCase()) ||
      p.participant_id.toLowerCase().includes(search.toLowerCase()) ||
      p.symbol.toLowerCase().includes(search.toLowerCase())
    );
    if (sideFilter) r = r.filter(p => p.side === sideFilter);
    setFiltered(r);
  }, [all, search, sideFilter]);

  const totalUnrealized = all.reduce((s, p) => s + parseFloat(p.unrealized_pnl), 0);
  const longCount = all.filter(p => p.side === 'LONG').length;
  const shortCount = all.filter(p => p.side === 'SHORT').length;

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Positions</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">All open positions across participants</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Positions',   value: all.length },
          { label: 'Long',              value: longCount,  cls: 'text-[color:var(--success)]' },
          { label: 'Short',             value: shortCount, cls: 'text-[color:var(--danger)]' },
          { label: 'Total Unrealized',  value: (totalUnrealized >= 0 ? '+' : '') + fmtCur(String(totalUnrealized.toFixed(2))), cls: pnlColor(String(totalUnrealized)) },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${cls ?? 'text-[color:var(--foreground)]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participant or symbol…"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
        </div>
        <select value={sideFilter} onChange={e => setSideFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]">
          <option value="">All sides</option>
          <option value="LONG">Long</option>
          <option value="SHORT">Short</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No positions found" icon={<Briefcase size={28} />} />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Participant', 'Symbol', 'Side', 'Qty', 'Avg Entry', 'Curr Price', 'Mkt Value', 'Unreal P&L', 'Real P&L'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${i >= 3 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[color:var(--foreground)] whitespace-nowrap">{p.participant_display_name}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-[color:var(--foreground)]">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p.side === 'LONG' ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
                        {p.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{p.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{fmtCur(p.average_entry_price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground)]">{fmtCur(p.current_price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{fmtCur(p.market_value)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlColor(p.unrealized_pnl)}`}>
                      {pnlPrefix(p.unrealized_pnl)}{fmtCur(p.unrealized_pnl)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlColor(p.realized_pnl)}`}>
                      {pnlPrefix(p.realized_pnl)}{fmtCur(p.realized_pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[10px] text-[color:var(--foreground-muted)] border-t border-[color:var(--border)]">
            Read-only · Values are authoritative backend figures · Admin cannot modify positions
          </p>
        </div>
      )}
    </div>
  );
}

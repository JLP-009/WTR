import { useEffect, useState } from 'react';
import { Search, RefreshCw, ShoppingCart } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminOrdersMonitor } from '../../../lib/api/admin';
import type { AdminOrder } from '../../../types/admin';

const fmtCur = (s: string | null) =>
  s ? '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s)) : '—';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

const STATUSES = ['', 'PENDING', 'ACCEPTED', 'FILLED', 'REJECTED', 'FAILED', 'CANCELLED'];
const SIDES = ['', 'BUY', 'SELL', 'CLOSE'];

export default function OrdersPage() {
  const [all, setAll] = useState<AdminOrder[]>([]);
  const [filtered, setFiltered] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sideFilter, setSideFilter] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getAdminOrdersMonitor(); setAll(r.data); }
    catch { setError('Unable to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...all];
    if (search) r = r.filter(o =>
      o.participant_display_name.toLowerCase().includes(search.toLowerCase()) ||
      o.participant_id.toLowerCase().includes(search.toLowerCase()) ||
      o.symbol.toLowerCase().includes(search.toLowerCase()) ||
      o.order_id.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter) r = r.filter(o => o.status === statusFilter);
    if (sideFilter) r = r.filter(o => o.side === sideFilter);
    setFiltered(r);
  }, [all, search, statusFilter, sideFilter]);

  const summary = {
    total: all.length,
    filled: all.filter(o => o.status === 'FILLED').length,
    rejected: all.filter(o => o.status === 'REJECTED' || o.status === 'FAILED').length,
    pending: all.filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED').length,
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Orders</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">All participant orders — read-only monitor</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: summary.total,    color: 'text-[color:var(--foreground)]' },
          { label: 'Filled',   value: summary.filled,   color: 'text-[color:var(--success)]' },
          { label: 'Rejected', value: summary.rejected, color: 'text-[color:var(--danger)]' },
          { label: 'Pending',  value: summary.pending,  color: 'text-[color:var(--warning)]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
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
            placeholder="Search participant, symbol, order ID…"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select value={sideFilter} onChange={e => setSideFilter(e.target.value)} className="px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]">
          {SIDES.map(s => <option key={s} value={s}>{s || 'All sides'}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No orders found" description="Try adjusting filters." icon={<ShoppingCart size={28} />} />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Time', 'Participant', 'Symbol', 'Side', 'Qty', 'Exec Price', 'Type', 'Status', 'Note'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${i >= 4 && i <= 5 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.order_id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)] transition-colors">
                    <td className="px-4 py-3 font-mono text-[color:var(--foreground-muted)] whitespace-nowrap">{fmtTime(o.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-[color:var(--foreground)] whitespace-nowrap">{o.participant_display_name}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-[color:var(--foreground)]">{o.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${o.side === 'BUY' ? 'text-[color:var(--success)]' : o.side === 'SELL' ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]'}`}>
                        {o.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{o.quantity || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground)]">{fmtCur(o.average_price)}</td>
                    <td className="px-4 py-3 text-[color:var(--foreground-muted)]">{o.order_type}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-[color:var(--foreground-muted)] max-w-[140px] truncate" title={o.rejection_reason}>
                      {o.rejection_reason ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[10px] text-[color:var(--foreground-muted)] border-t border-[color:var(--border)]">
            Showing {filtered.length} of {all.length} orders · Read-only · Admin cannot modify or cancel orders
          </p>
        </div>
      )}
    </div>
  );
}

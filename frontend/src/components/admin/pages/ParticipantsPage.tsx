import { useEffect, useState, useRef } from 'react';
import { Search, RefreshCw, ChevronRight, Users } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import {
  getAdminParticipants, enableAdminParticipant, disableAdminParticipant,
  generateIdempotencyKey, AdminApiError,
} from '../../../lib/api/admin';
import type { AdminParticipant } from '../../../types/admin';

const fmtCur = (s?: string) =>
  s ? '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s)) : '—';

const pnlColor = (s?: string) => {
  if (!s) return 'text-[color:var(--foreground-secondary)]';
  const v = parseFloat(s);
  return v > 0 ? 'text-[color:var(--success)]' : v < 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]';
};

type ActionType = 'enable' | 'disable' | null;

export default function ParticipantsPage() {
  const [items, setItems] = useState<AdminParticipant[]>([]);
  const [filtered, setFiltered] = useState<AdminParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<{ type: ActionType; participant: AdminParticipant } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState<AdminParticipant | null>(null);

  const idk = useRef<Record<string, string>>({});
  const getIdk = (k: string) => { if (!idk.current[k]) idk.current[k] = generateIdempotencyKey(); return idk.current[k]; };

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getAdminParticipants(); setItems(r.data); }
    catch { setError('Unable to load participants'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...items];
    if (search) r = r.filter(p => p.display_name.toLowerCase().includes(search.toLowerCase()) || p.participant_id.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) r = r.filter(p => p.status === statusFilter);
    setFiltered(r);
  }, [items, search, statusFilter]);

  const runAction = async () => {
    if (!dialog) return;
    setActionLoading(true); setActionError('');
    try {
      const key = getIdk(`${dialog.type}-${dialog.participant.participant_id}`);
      let result: AdminParticipant;
      if (dialog.type === 'enable')  result = await enableAdminParticipant(dialog.participant.participant_id, key);
      else                            result = await disableAdminParticipant(dialog.participant.participant_id, key);
      setItems(prev => prev.map(p => p.participant_id === result.participant_id ? result : p));
      if (selected?.participant_id === result.participant_id) setSelected(result);
      setDialog(null);
    } catch (e) {
      setActionError(e instanceof AdminApiError ? e.userMessage : 'Operation failed.');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Participants</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">{items.length} registered</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {actionError && (
        <div className="px-4 py-3 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/20 text-sm text-[color:var(--danger)]">{actionError}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No participants found" description="Try adjusting the search or filter." icon={<Users size={28} />} />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['ID', 'Name', 'Status', 'Rank', 'Equity', 'P&L', 'Orders', 'Positions', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${i > 2 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const totalPnl = p.realized_pnl && p.unrealized_pnl
                    ? String(parseFloat(p.realized_pnl) + parseFloat(p.unrealized_pnl))
                    : undefined;
                  return (
                    <tr
                      key={p.participant_id}
                      className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)] transition-colors cursor-pointer"
                      onClick={() => setSelected(selected?.participant_id === p.participant_id ? null : p)}
                    >
                      <td className="px-4 py-3 font-mono text-[color:var(--foreground-secondary)]">{p.participant_id}</td>
                      <td className="px-4 py-3 font-medium text-[color:var(--foreground)] whitespace-nowrap">{p.display_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">
                        {p.rank ? `#${p.rank}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground)]">{fmtCur(p.equity)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${pnlColor(totalPnl)}`}>
                        {totalPnl ? (parseFloat(totalPnl) >= 0 ? '+' : '') + fmtCur(totalPnl) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{p.total_orders ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)]">{p.open_positions ?? '—'}</td>
                      <td className="px-4 py-3">
                        <ChevronRight size={14} className={`ml-auto transition-transform ${selected?.participant_id === p.participant_id ? 'rotate-90' : ''} text-[color:var(--foreground-muted)]`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">{selected.display_name}</p>
              <p className="text-xs font-mono text-[color:var(--foreground-muted)]">{selected.participant_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} size="md" />
              {selected.status === 'ACTIVE' ? (
                <button
                  onClick={() => { setActionError(''); setDialog({ type: 'disable', participant: selected }); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--danger)]/10 text-[color:var(--danger)] border border-[color:var(--danger)]/20 hover:bg-[color:var(--danger)]/20 transition-colors"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={() => { setActionError(''); setDialog({ type: 'enable', participant: selected }); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[color:var(--success)]/10 text-[color:var(--success)] border border-[color:var(--success)]/20 hover:bg-[color:var(--success)]/20 transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-[color:var(--border)]">
            {[
              { label: 'Rank',        value: selected.rank ? `#${selected.rank}` : '—' },
              { label: 'Equity',      value: fmtCur(selected.equity) },
              { label: 'Cash Balance',value: fmtCur(selected.balance) },
              { label: 'Realized P&L',value: fmtCur(selected.realized_pnl) },
              { label: 'Unrealized',  value: fmtCur(selected.unrealized_pnl) },
              { label: 'Total Orders',value: selected.total_orders ?? '—' },
              { label: 'Open Positions', value: selected.open_positions ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                <p className="text-sm font-medium text-[color:var(--foreground)]">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[color:var(--foreground-muted)]">
            Admin cannot modify participant balance, P&L, trade prices, or positions per API contract.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        onConfirm={runAction}
        title={dialog?.type === 'disable' ? `Disable ${dialog.participant.display_name}?` : `Enable ${dialog?.participant.display_name}?`}
        description={
          dialog?.type === 'disable'
            ? 'This participant will not be able to submit orders. Their existing positions will remain open until the day closes.'
            : 'This participant will regain the ability to submit orders.'
        }
        confirmLabel={dialog?.type === 'disable' ? 'Disable Participant' : 'Enable Participant'}
        destructive={dialog?.type === 'disable'}
        loading={actionLoading}
      />
    </div>
  );
}

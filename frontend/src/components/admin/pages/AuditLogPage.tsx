import { useEffect, useState } from 'react';
import { RefreshCw, ClipboardList, Search } from 'lucide-react';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminAuditLog } from '../../../lib/api/admin';
import type { AuditLogEntry, AuditAction } from '../../../types/admin';

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  EVENT_STARTED:     'text-[color:var(--success)] bg-[color:var(--success)]/10',
  EVENT_ENDED:       'text-[color:var(--danger)] bg-[color:var(--danger)]/10',
  EVENT_PAUSED:      'text-[color:var(--warning)] bg-[color:var(--warning)]/10',
  EVENT_RESUMED:     'text-[color:var(--accent)] bg-[color:var(--accent)]/10',
  MARKET_HALTED:     'text-[color:var(--danger)] bg-[color:var(--danger)]/10',
  PARTICIPANT_DISABLED: 'text-[color:var(--danger)] bg-[color:var(--danger)]/10',
  SYSTEM_ERROR:      'text-[color:var(--danger)] bg-[color:var(--danger)]/10',
  DATA_ERROR:        'text-[color:var(--danger)] bg-[color:var(--danger)]/10',
};

function ActionBadge({ action }: { action: AuditAction }) {
  const cls = ACTION_COLORS[action] ?? 'text-[color:var(--foreground-secondary)] bg-[color:var(--surface-muted)]';
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold whitespace-nowrap ${cls}`}>
      {action}
    </span>
  );
}

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

export default function AuditLogPage() {
  const [all, setAll] = useState<AuditLogEntry[]>([]);
  const [filtered, setFiltered] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getAdminAuditLog(); setAll(r.data); }
    catch { setError('Unable to load audit log'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...all];
    if (search) r = r.filter(e =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.actor_id.toLowerCase().includes(search.toLowerCase()) ||
      e.target.toLowerCase().includes(search.toLowerCase()) ||
      (e.reason ?? '').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(r);
  }, [all, search]);

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Audit Log</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Append-only admin action history</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by action, actor, target, reason…"
          className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit entries" icon={<ClipboardList size={28} />} />
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const isExpanded = expanded === entry.audit_id;
            return (
              <div
                key={entry.audit_id}
                className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden"
              >
                {/* Summary row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : entry.audit_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--surface-muted)] transition-colors"
                >
                  <div className="w-1 self-stretch rounded-full bg-[color:var(--border)] flex-shrink-0" />
                  <div className="flex-1 min-w-0 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 items-center">
                    <ActionBadge action={entry.action} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[color:var(--foreground)] truncate">
                        {entry.target} {entry.reason ? `· "${entry.reason}"` : ''}
                      </p>
                      <p className="text-[10px] text-[color:var(--foreground-muted)]">
                        {entry.actor_id}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-[color:var(--foreground-muted)] text-right whitespace-nowrap shrink-0">
                      {fmt(entry.timestamp)}
                    </p>
                  </div>
                  <span className="text-[color:var(--foreground-muted)] flex-shrink-0 text-xs">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[color:var(--border)] px-4 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Previous State</p>
                        <pre className="text-[10px] font-mono bg-[color:var(--surface-muted)] rounded-lg p-3 overflow-x-auto text-[color:var(--foreground-secondary)]">
                          {JSON.stringify(entry.previous_state, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">New State</p>
                        <pre className="text-[10px] font-mono bg-[color:var(--surface-muted)] rounded-lg p-3 overflow-x-auto text-[color:var(--foreground-secondary)]">
                          {JSON.stringify(entry.new_state, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                      {[
                        { label: 'Audit ID',         value: entry.audit_id },
                        { label: 'Request ID',       value: entry.request_id },
                        { label: 'Idempotency Key',  value: entry.idempotency_key },
                        { label: 'Actor',            value: entry.actor_id },
                        { label: 'Target',           value: entry.target },
                        ...(entry.reason ? [{ label: 'Reason', value: entry.reason }] : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-0.5">
                          <p className="font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                          <p className="font-mono text-[color:var(--foreground-secondary)] break-all">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-center text-[color:var(--foreground-muted)]">
        Audit log is append-only. Entries cannot be modified or deleted.
      </p>
    </div>
  );
}

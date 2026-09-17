import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminMonitoring } from '../../../lib/api/admin';
import type { AdminMonitoringState, HealthStatus } from '../../../types/admin';

function deriveHealth(m: AdminMonitoringState): HealthStatus {
  if (!m.cursor_healthy || !m.database_healthy) return 'DEGRADED';
  if (!m.websocket_healthy || m.errors_last_hour > 5) return 'WARNING';
  return 'HEALTHY';
}

function HealthIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (!ok) return <XCircle size={16} className="text-[color:var(--danger)]" />;
  if (warn) return <AlertCircle size={16} className="text-[color:var(--warning)]" />;
  return <CheckCircle size={16} className="text-[color:var(--success)]" />;
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--border)] last:border-0">
      <HealthIcon ok={ok} />
      <span className="flex-1 text-xs font-medium text-[color:var(--foreground)]">{label}</span>
      {detail && <span className="text-[10px] text-[color:var(--foreground-muted)] tabular-nums">{detail}</span>}
      <span className={`text-[10px] font-semibold ${ok ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
        {ok ? 'OK' : 'ISSUE'}
      </span>
    </div>
  );
}

export default function MonitoringPage() {
  const [m, setM] = useState<AdminMonitoringState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setM(await getAdminMonitoring()); setLastRefresh(new Date()); }
    catch { setError('Unable to load monitoring data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 15_000); return () => clearInterval(id); }, []);

  if (loading && !m) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  const overall = m ? deriveHealth(m) : 'OFFLINE';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Monitoring</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
            System health · Auto-refreshes every 15s
            {lastRefresh && ` · Last: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Overall health banner */}
      {m && (
        <div className={`px-5 py-4 rounded-xl border flex items-center justify-between gap-4 ${
          overall === 'HEALTHY'  ? 'bg-[color:var(--success)]/8 border-[color:var(--success)]/25' :
          overall === 'WARNING'  ? 'bg-[color:var(--warning)]/8 border-[color:var(--warning)]/25' :
          'bg-[color:var(--danger)]/8 border-[color:var(--danger)]/25'
        }`}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-1">Overall System Health</p>
            <StatusBadge status={overall} size="md" />
          </div>
          <div className="text-right text-xs text-[color:var(--foreground-muted)]">
            {m.errors_last_hour > 0 && (
              <p className="text-[color:var(--danger)] font-medium">{m.errors_last_hour} error{m.errors_last_hour > 1 ? 's' : ''} in last hour</p>
            )}
          </div>
        </div>
      )}

      {m && (
        <>
          {/* Current state */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-4">Event & Simulation State</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              {[
                { label: 'Event',      value: <StatusBadge status={m.event_status} size="md" /> },
                { label: 'Simulation', value: <StatusBadge status={m.simulation_status} size="md" /> },
                { label: 'Market',     value: <StatusBadge status={m.market_status} size="md" /> },
                { label: 'Day',        value: <StatusBadge status={m.day_status} size="md" /> },
                { label: 'Sim Day',    value: `Day ${m.simulation_day}` },
                { label: 'Sim Time',   value: <span className="font-mono">{m.simulation_time}</span> },
                { label: 'Intervals Today', value: m.intervals_committed_today },
                { label: 'Last Interval', value: new Date(m.last_interval_commit_at).toLocaleTimeString() },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                  <div className="text-sm font-medium text-[color:var(--foreground)]">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Service health checks */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">Service Health</p>
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
              <HealthRow label="Simulation Cursor" ok={m.cursor_healthy} detail="Interval emission" />
              <HealthRow label="Database" ok={m.database_healthy} detail="Read/write operations" />
              <HealthRow label="WebSocket" ok={m.websocket_healthy} detail="Live participant connections" />
              <HealthRow label="Order Processing" ok={m.errors_last_hour === 0} detail={`${m.errors_last_hour} errors/hr`} />
            </div>
          </div>

          {/* Participant metrics */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">Participant Activity</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Participants', value: m.total_participants },
                { label: 'Active Now',         value: m.active_participants },
                { label: 'Orders Today',       value: m.orders_today },
                { label: 'Errors (1h)',        value: m.errors_last_hour },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
                  <p className="text-2xl font-bold tabular-nums text-[color:var(--foreground)]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset info */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">Active Dataset</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] text-[color:var(--foreground-muted)]">Dataset ID</p>
                <p className="text-xs font-mono text-[color:var(--foreground-secondary)]">{m.dataset_id}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-[color:var(--foreground-muted)]">Checksum</p>
                <p className="text-xs font-mono text-[color:var(--foreground-secondary)] break-all">{m.dataset_checksum}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

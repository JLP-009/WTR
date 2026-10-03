import { useEffect, useState } from 'react';
import { Users, ShoppingCart, Briefcase, Clock, Zap, Activity } from 'lucide-react';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import DaySessionTimer from '../common/DaySessionTimer';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminEvent, getAdminMonitoring, getAdminOrdersMonitor, advanceAdminSimulationDay, generateIdempotencyKey } from '../../../lib/api/admin';
import type { AdminEventState, AdminMonitoringState, AdminOrder } from '../../../types/admin';
import type { AdminRoute } from '../../../admin/AdminApp';

const fmtNum = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtCur = (s: string) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s));

interface DashboardProps {
  onNavigate: (r: AdminRoute) => void;
}

function rel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function AdminDashboard({ onNavigate }: DashboardProps) {
  const [event, setEvent] = useState<AdminEventState | null>(null);
  const [monitoring, setMonitoring] = useState<AdminMonitoringState | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [e, m, o] = await Promise.all([
        getAdminEvent(),
        getAdminMonitoring(),
        getAdminOrdersMonitor(),
      ]);
      setEvent(e);
      setMonitoring(m);
      setRecentOrders(o.data.slice(0, 6));
    } catch { setError('Unable to load dashboard data'); }
    finally { setLoading(false); }
  };

  const handleStartNextDay = async () => {
    setActionLoading(true);
    try {
      await advanceAdminSimulationDay(generateIdempotencyKey());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance to next day');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonCard />
    </div>
  );

  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Dashboard</h1>
        <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
          Warangal Trading Ring — Admin Control Center
        </p>
      </div>

      {/* Live Trading Day Session Timer & Control */}
      {event && (
        <DaySessionTimer
          simulationDay={event.simulation_day}
          totalSimulationDays={event.configured_total_simulation_days}
          intervalIndex={event.cursor?.interval_index ?? 0}
          marketStatus={event.market_status}
          dayStatus={event.day_status}
          simulationTime={event.simulation_time}
          onStartNextDay={handleStartNextDay}
          onOpenNews={() => onNavigate('news')}
          actionLoading={actionLoading}
        />
      )}

      {/* Event status hero */}
      {event && (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">
                Current Event
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={event.event_status} showDot size="md" />
                <span className="text-sm text-[color:var(--foreground-secondary)]">
                  Simulation Day {event.simulation_day} / {event.configured_total_simulation_days}
                </span>
                <span className="font-mono text-sm text-[color:var(--foreground-secondary)]">
                  {event.simulation_time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-center px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)]">
                <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Market</p>
                <StatusBadge status={event.market_status} showDot />
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)]">
                <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Simulation</p>
                <StatusBadge status={event.simulation_status} showDot />
              </div>
              <div className="text-center px-3 py-1.5 rounded-lg bg-[color:var(--surface-muted)]">
                <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Day</p>
                <StatusBadge status={event.day_status} showDot />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[color:var(--border)]">
            <div>
              <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Days Remaining</p>
              <p className="text-xl font-bold text-[color:var(--foreground)] tabular-nums">{event.days_remaining}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Symbols</p>
              <p className="text-xl font-bold text-[color:var(--foreground)] tabular-nums">{event.event_symbol_count}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Last Close</p>
              <p className="text-xl font-bold text-[color:var(--foreground)] tabular-nums">{fmtCur(event.last_committed_close)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[color:var(--foreground-muted)] uppercase tracking-wide">Updated</p>
              <p className="text-sm font-medium text-[color:var(--foreground-secondary)] tabular-nums">{rel(event.updated_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {monitoring && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Participants"
            value={fmtNum(monitoring.total_participants)}
            sub={`${fmtNum(monitoring.active_participants)} active`}
            icon={<Users size={16} />}
          />
          <StatCard
            label="Orders Today"
            value={fmtNum(monitoring.orders_today)}
            sub="across all participants"
            icon={<ShoppingCart size={16} />}
          />
          <StatCard
            label="Intervals Today"
            value={fmtNum(monitoring.intervals_committed_today)}
            sub="committed"
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Errors (1h)"
            value={monitoring.errors_last_hour}
            sub={monitoring.errors_last_hour === 0 ? 'All clear' : 'Check monitoring'}
            icon={<Zap size={16} />}
            accent={monitoring.errors_last_hour > 0}
          />
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Event Control', icon: <Zap size={15} />, route: 'event' as AdminRoute },
            { label: 'Simulation',    icon: <Activity size={15} />, route: 'simulation' as AdminRoute },
            { label: 'Participants',  icon: <Users size={15} />, route: 'participants' as AdminRoute },
            { label: 'Monitoring',   icon: <Clock size={15} />, route: 'monitoring' as AdminRoute },
          ].map(({ label, icon, route }) => (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-xs font-medium text-[color:var(--foreground-secondary)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/5 transition-colors"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">
              Recent Orders
            </p>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-hover)] font-medium transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    {['Participant', 'Symbol', 'Side', 'Qty', 'Price', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.order_id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface-muted)] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[color:var(--foreground)] whitespace-nowrap">{o.participant_display_name}</td>
                      <td className="px-4 py-2.5 font-mono text-[color:var(--foreground-secondary)]">{o.symbol}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${o.side === 'BUY' ? 'text-[color:var(--success)]' : o.side === 'SELL' ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]'}`}>
                          {o.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-[color:var(--foreground-secondary)]">{o.quantity}</td>
                      <td className="px-4 py-2.5 tabular-nums text-[color:var(--foreground-secondary)]">
                        {o.average_price ? fmtCur(o.average_price) : '—'}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System health */}
      {monitoring && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">
            System Health
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Simulation Cursor', ok: monitoring.cursor_healthy },
              { label: 'Database', ok: monitoring.database_healthy },
              { label: 'WebSocket', ok: monitoring.websocket_healthy },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
                <div className={`w-2 h-2 rounded-full ${ok ? 'bg-[color:var(--success)]' : 'bg-[color:var(--danger)]'}`} />
                <span className="text-xs font-medium text-[color:var(--foreground-secondary)]">{label}</span>
                <span className={`ml-auto text-[10px] font-semibold ${ok ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
                  {ok ? 'OK' : 'ISSUE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

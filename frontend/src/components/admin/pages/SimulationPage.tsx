import { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, ChevronRight, RefreshCw, Calendar, FastForward } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import DaySessionTimer from '../common/DaySessionTimer';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import {
  getAdminSimulation, getAdminEvent,
  startAdminSimulation, pauseAdminSimulation, resumeAdminSimulation,
  closeDayAdmin, nextDayAdmin, setSimulationDay, generateIdempotencyKey, AdminApiError,
} from '../../../lib/api/admin';
import type { AdminSimulationState, AdminEventState } from '../../../types/admin';

type SimAction = 'start' | 'pause' | 'resume' | 'close-day' | 'next-day' | 'jump-day' | null;

function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>}
      <div className="h-2 rounded-full bg-[color:var(--surface-muted)] overflow-hidden">
        <div className="h-full rounded-full bg-[color:var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-mono text-[color:var(--foreground-secondary)] tabular-nums">{value} / {max} ({pct.toFixed(1)}%)</p>
    </div>
  );
}

export default function SimulationPage() {
  const [sim, setSim] = useState<AdminSimulationState | null>(null);
  const [event, setEvent] = useState<AdminEventState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<SimAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [targetDay, setTargetDay] = useState<number>(1);

  const idk = useRef<Record<string, string>>({});
  const getIdk = (op: string) => { if (!idk.current[op]) idk.current[op] = generateIdempotencyKey(); return idk.current[op]; };
  const resetIdk = (op: string) => { delete idk.current[op]; };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [s, e] = await Promise.all([getAdminSimulation(), getAdminEvent()]);
      setSim(s); setEvent(e);
      if (s) {
        setTargetDay(Math.min((s.simulation_day || 1) + 1, e?.configured_total_simulation_days || 20));
      }
    } catch { setError('Unable to load simulation state'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (op: SimAction) => {
    if (!op) return;
    setActionLoading(true); setActionError('');
    try {
      const key = getIdk(op);
      let result: AdminSimulationState | undefined;
      if (op === 'start')     result = await startAdminSimulation(key);
      if (op === 'pause')     result = await pauseAdminSimulation(key);
      if (op === 'resume')    result = await resumeAdminSimulation(key);
      if (op === 'close-day') result = await closeDayAdmin(key);
      if (op === 'next-day')  result = await nextDayAdmin(key);
      if (op === 'jump-day')  result = await setSimulationDay(targetDay, key);
      if (result) setSim(result);
      resetIdk(op);
      setDialog(null);
      // Reload full state for event status update
      await load();
    } catch (e) {
      const msg = e instanceof AdminApiError ? e.userMessage : 'Operation failed. Please try again.';
      setActionError(msg);
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  const s = sim!;
  const e = event!;
  const totalIntervals = 72;
  const totalDays = e.configured_total_simulation_days;

  const canStart = s.simulation_status === 'STOPPED';
  const canPause = s.simulation_status === 'RUNNING';
  const canResume = s.simulation_status === 'PAUSED';
  const canCloseDay = (s.simulation_status === 'RUNNING' || s.simulation_status === 'PAUSED');
  const canNextDay = s.simulation_day < totalDays || e.days_remaining > 0;

  const ACTIONS: { op: SimAction; label: string; sub: string; icon: React.ReactNode; enabled: boolean; className: string }[] = [
    { op: 'start',     label: 'Start Sim',   sub: 'Begin Day',       icon: <Play size={18} />,        enabled: canStart,    className: 'text-[color:var(--success)] bg-[color:var(--success)]/8 border-[color:var(--success)]/25 hover:bg-[color:var(--success)]/15' },
    { op: 'pause',     label: 'Pause Sim',   sub: 'Halt interval',   icon: <Pause size={18} />,       enabled: canPause,    className: 'text-[color:var(--warning)] bg-[color:var(--warning)]/8 border-[color:var(--warning)]/25 hover:bg-[color:var(--warning)]/15' },
    { op: 'resume',    label: 'Resume Sim',  sub: 'Continue',        icon: <RotateCcw size={18} />,   enabled: canResume,   className: 'text-[color:var(--accent)] bg-[color:var(--accent)]/8 border-[color:var(--accent)]/25 hover:bg-[color:var(--accent)]/15' },
    { op: 'close-day', label: 'Close Day',   sub: 'Finalize day',    icon: <SkipForward size={18} />, enabled: canCloseDay, className: 'text-[color:var(--warning)] bg-[color:var(--warning)]/8 border-[color:var(--warning)]/25 hover:bg-[color:var(--warning)]/15' },
    { op: 'next-day',  label: 'Next Day',    sub: 'Skip / Advance',  icon: <ChevronRight size={18} />, enabled: canNextDay, className: 'text-[color:var(--accent)] bg-[color:var(--accent)]/8 border-[color:var(--accent)]/25 hover:bg-[color:var(--accent)]/15' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Simulation Control</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Manage simulation progression</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {actionError && (
        <div className="px-4 py-3 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/20 text-sm text-[color:var(--danger)]">
          {actionError}
        </div>
      )}

      {/* Live Trading Day Session Timer & Control */}
      <DaySessionTimer
        simulationDay={s.simulation_day}
        totalSimulationDays={totalDays}
        intervalIndex={s.interval_index}
        marketStatus={e.market_status}
        dayStatus={e.day_status}
        simulationTime={s.simulation_time}
        onStartNextDay={() => runAction('next-day')}
        onSkipDay={canNextDay ? () => { setActionError(''); setDialog('next-day'); } : undefined}
        actionLoading={actionLoading}
      />

      {/* Status overview */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-5">Current State</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 mb-6">
          {[
            { label: 'Simulation', value: <StatusBadge status={s.simulation_status} size="md" /> },
            { label: 'Event',      value: <StatusBadge status={e.event_status} size="md" /> },
            { label: 'Day Status', value: <StatusBadge status={e.day_status} size="md" /> },
            { label: 'Day',        value: `Day ${s.simulation_day} / ${totalDays}` },
            { label: 'Sim Time',   value: <span className="font-mono">{s.simulation_time}</span> },
            { label: 'Speed',      value: `${s.simulation_speed}×` },
            { label: 'Interval',   value: `${s.interval_index} / ${totalIntervals}` },
            { label: 'Remaining Today', value: s.intervals_remaining_today },
            { label: 'Last Commit', value: new Date(s.last_commit_at).toLocaleTimeString() },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
              <div className="text-sm font-medium text-[color:var(--foreground)]">{value}</div>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="space-y-4 pt-5 border-t border-[color:var(--border)]">
          <ProgressBar label="Day Progress (intervals)" value={s.interval_index} max={totalIntervals} />
          <ProgressBar label="Event Progress (days)" value={s.simulation_day - 1} max={totalDays} />
        </div>
      </div>

      {/* Controls */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">Controls</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {ACTIONS.map(({ op, label, sub, icon, enabled, className }) => (
            <button
              key={op}
              onClick={() => { setActionError(''); setDialog(op); }}
              disabled={!enabled}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
            >
              {icon}
              <div className="text-center">
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] opacity-70">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Jump to Any Simulation Day (Skip / Change Day mid-session) */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[color:var(--accent)]" />
              <h3 className="text-sm font-bold text-[color:var(--foreground)]">
                Jump to Any Trading Day
              </h3>
            </div>
            <p className="text-xs text-[color:var(--foreground-muted)]">
              Skip forward or jump to any day in between sessions or during live trading. Resets interval clock to 09:15 and starts Day X.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold text-[color:var(--foreground-secondary)]">
              Target Day:
            </label>
            <select
              value={targetDay}
              onChange={(e) => setTargetDay(Number(e.target.value))}
              className="px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
            >
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Day {d} {d === s.simulation_day ? '(Current)' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => { setActionError(''); setDialog('jump-day'); }}
              disabled={actionLoading || targetDay === s.simulation_day}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FastForward size={14} />
              <span>Jump to Day {targetDay}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmations */}
      <ConfirmDialog open={dialog === 'start'}     onClose={() => setDialog(null)} onConfirm={() => runAction('start')}     title="Start Simulation?" description="Begins interval emission for today's trading day. Ensure the market is in PRE_OPEN state." confirmLabel="Start Simulation" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'pause'}     onClose={() => setDialog(null)} onConfirm={() => runAction('pause')}     title="Pause Simulation?" description="Halts interval emission. Current intervals in progress will complete. Resume to continue." confirmLabel="Pause Simulation" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'resume'}    onClose={() => setDialog(null)} onConfirm={() => runAction('resume')}    title="Resume Simulation?" description="Continues from the next unconsumed interval. Does not replay elapsed wall-clock time." confirmLabel="Resume" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'close-day'} onClose={() => setDialog(null)} onConfirm={() => runAction('close-day')} title="Close Today's Day?" description="Ends the current trading day, commits the final closing price, and takes a leaderboard snapshot. This cannot be undone." confirmLabel="Close Day" destructive loading={actionLoading} />
      <ConfirmDialog open={dialog === 'next-day'}  onClose={() => setDialog(null)} onConfirm={() => runAction('next-day')}  title="Advance / Skip to Next Day?" description={`Immediately moves simulation to Day ${Math.min(s.simulation_day + 1, totalDays)} and begins the trading session. Are you sure?`} confirmLabel="Advance Day" loading={actionLoading} />
      <ConfirmDialog open={dialog === 'jump-day'}  onClose={() => setDialog(null)} onConfirm={() => runAction('jump-day')}  title={`Jump directly to Simulation Day ${targetDay}?`} description={`This will immediately switch the market to Day ${targetDay}, reset the interval clock to 09:15:00, and open the session. Are you sure?`} confirmLabel={`Jump to Day ${targetDay}`} destructive loading={actionLoading} />
    </div>
  );
}

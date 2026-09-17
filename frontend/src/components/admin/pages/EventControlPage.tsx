import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Play, Pause, Square, RotateCcw, Lock, Calendar } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorState from '../../common/ErrorState';
import { SkeletonCard } from '../../common/LoadingState';
import {
  getAdminEvent, getAdminEventConfig,
  startAdminEvent, pauseAdminEvent, resumeAdminEvent, endAdminEvent,
  generateIdempotencyKey, AdminApiError,
} from '../../../lib/api/admin';
import type { AdminEventState, AdminEventConfig } from '../../../types/admin';

type DialogType = 'start' | 'pause' | 'resume' | 'end' | null;

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{label}</p>
      <p className={`text-sm font-medium text-[color:var(--foreground)] ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

export default function EventControlPage() {
  const [event, setEvent] = useState<AdminEventState | null>(null);
  const [config, setConfig] = useState<AdminEventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<DialogType>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Idempotency keys — cached per command so retries use the same key
  const idk = useRef<Record<string, string>>({});
  const getIdk = (op: string) => {
    if (!idk.current[op]) idk.current[op] = generateIdempotencyKey();
    return idk.current[op];
  };
  const resetIdk = (op: string) => { delete idk.current[op]; };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [e, c] = await Promise.all([getAdminEvent(), getAdminEventConfig()]);
      setEvent(e); setConfig(c);
    } catch { setError('Unable to load event state'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (op: DialogType) => {
    if (!op) return;
    setActionLoading(true); setActionError('');
    try {
      let result: AdminEventState | undefined;
      const key = getIdk(op);
      if (op === 'start')  result = await startAdminEvent(key);
      if (op === 'pause')  result = await pauseAdminEvent(key);
      if (op === 'resume') result = await resumeAdminEvent(key);
      if (op === 'end')    result = await endAdminEvent(key);
      if (result) setEvent(result);
      // Reset idempotency key only on success (so retries use same key if it didn't succeed)
      resetIdk(op);
      setDialog(null);
    } catch (e) {
      const msg = e instanceof AdminApiError ? e.userMessage : 'Operation failed. Please try again.';
      setActionError(msg);
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  const s = event!;
  const canStart = s.event_status === 'READY';
  const canPause = s.event_status === 'RUNNING';
  const canResume = s.event_status === 'PAUSED';
  const canEnd = s.event_status === 'RUNNING' || s.event_status === 'PAUSED';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Event Control</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">Manage event lifecycle and state</p>
        </div>
        <button onClick={load} aria-label="Refresh" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/20 text-sm text-[color:var(--danger)]">
          {actionError}
        </div>
      )}

      {/* Current state card */}
      <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">Event State</p>
          <span className="text-xs font-mono text-[color:var(--foreground-muted)] truncate ml-2">{s.event_id}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
          <Field label="Event Status" value={<StatusBadge status={s.event_status} size="md" />} />
          <Field label="Simulation" value={<StatusBadge status={s.simulation_status} size="md" />} />
          <Field label="Market" value={<StatusBadge status={s.market_status} size="md" />} />
          <Field label="Day" value={<StatusBadge status={s.day_status} size="md" />} />
          <Field label="Simulation Day" value={`Day ${s.simulation_day} of ${s.configured_total_simulation_days}`} />
          <Field label="Days Remaining" value={s.days_remaining} />
          <Field label="Simulated Time" value={s.simulation_time} mono />
          <Field label="Interval" value={`${s.cursor.interval_index} / 72`} />
          <Field label="Last Close" value={`₹${parseFloat(s.last_committed_close).toLocaleString('en-IN')}`} mono />
          <Field label="Symbols" value={s.event_symbol_count} />
          <Field label="Dataset" value={<span className="font-mono text-[11px]">{s.dataset_id}</span>} />
          <Field label="Updated" value={new Date(s.updated_at).toLocaleTimeString()} />
        </div>
      </div>

      {/* Lifecycle controls */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">
          Event Controls
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => { setActionError(''); setDialog('start'); }}
            disabled={!canStart}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-[color:var(--success)]/8 border-[color:var(--success)]/25 text-[color:var(--success)] hover:bg-[color:var(--success)]/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Play size={20} />
            <span className="text-xs font-semibold">Start Event</span>
          </button>
          <button
            onClick={() => { setActionError(''); setDialog('pause'); }}
            disabled={!canPause}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-[color:var(--warning)]/8 border-[color:var(--warning)]/25 text-[color:var(--warning)] hover:bg-[color:var(--warning)]/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Pause size={20} />
            <span className="text-xs font-semibold">Pause Event</span>
          </button>
          <button
            onClick={() => { setActionError(''); setDialog('resume'); }}
            disabled={!canResume}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-[color:var(--accent)]/8 border-[color:var(--accent)]/25 text-[color:var(--accent)] hover:bg-[color:var(--accent)]/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <RotateCcw size={20} />
            <span className="text-xs font-semibold">Resume Event</span>
          </button>
          <button
            onClick={() => { setActionError(''); setDialog('end'); }}
            disabled={!canEnd}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-[color:var(--danger)]/8 border-[color:var(--danger)]/25 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <Square size={20} />
            <span className="text-xs font-semibold">End Event</span>
          </button>
        </div>
        {s.event_status === 'ENDED' && (
          <p className="mt-3 text-xs text-[color:var(--foreground-muted)] text-center">
            This event has ended. The leaderboard has been finalized. No further actions are possible.
          </p>
        )}
      </div>

      {/* Event configuration */}
      {config && (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">
              Configuration
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[color:var(--foreground-muted)]">
              {config.config_locked ? (
                <><Lock size={12} className="text-[color:var(--warning)]" /><span className="text-[color:var(--warning)]">Locked</span></>
              ) : (
                <><Calendar size={12} /><span>Editable (SETUP only)</span></>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
            <Field label="Total Sim Days" value={config.configured_total_simulation_days} />
            <Field label="Intervals / Day" value={config.intervals_per_day} />
            <Field label="Day Duration" value={`${config.simulated_day_duration_minutes} min`} />
            <Field label="Interval Length" value={`${config.data_interval_seconds}s`} />
            <Field label="Speed" value={`${config.simulation_speed}×`} />
            <Field label="Total Rows" value={config.expected_total_event_rows.toLocaleString('en-IN')} />
            <Field label="Dataset Days" value={config.dataset_total_days} />
            <Field label="Dataset Symbols" value={config.dataset_symbol_count} />
            <Field label="Dataset Status" value={<StatusBadge status={config.dataset_validation_status} />} />
          </div>
          <div className="mt-5 pt-5 border-t border-[color:var(--border)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-2">
              Active Symbols ({config.event_symbol_count})
            </p>
            <div className="flex flex-wrap gap-2">
              {config.event_symbols.map((sym) => (
                <span key={sym} className="px-2.5 py-1 rounded-md bg-[color:var(--surface-muted)] text-xs font-mono font-medium text-[color:var(--foreground-secondary)]">
                  {sym}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] mb-1">
              Dataset Checksum
            </p>
            <p className="text-xs font-mono text-[color:var(--foreground-muted)] break-all">{config.dataset_checksum}</p>
          </div>
        </div>
      )}

      {/* Confirmation dialogs */}
      <ConfirmDialog
        open={dialog === 'start'}
        onClose={() => setDialog(null)}
        onConfirm={() => runAction('start')}
        title="Start Event?"
        description="This will start the event and begin accepting participant orders. The configuration will be locked and cannot be changed after this point."
        confirmLabel="Start Event"
        loading={actionLoading}
      />
      <ConfirmDialog
        open={dialog === 'pause'}
        onClose={() => setDialog(null)}
        onConfirm={() => runAction('pause')}
        title="Pause Event?"
        description="This will pause all activity — simulation, market data, and participant order processing. The event can be resumed."
        confirmLabel="Pause Event"
        loading={actionLoading}
      />
      <ConfirmDialog
        open={dialog === 'resume'}
        onClose={() => setDialog(null)}
        onConfirm={() => runAction('resume')}
        title="Resume Event?"
        description="This will resume the event from where it was paused. Simulation and market data will continue from the next unconsumed interval."
        confirmLabel="Resume Event"
        loading={actionLoading}
      />
      <ConfirmDialog
        open={dialog === 'end'}
        onClose={() => setDialog(null)}
        onConfirm={() => runAction('end')}
        title="End Event?"
        description="This is a terminal action and cannot be undone. The event will be permanently ended, the leaderboard will be finalized, and no further trading will be possible."
        confirmLabel="End Event Permanently"
        cancelLabel="Keep Running"
        destructive
        loading={actionLoading}
      />
    </div>
  );
}

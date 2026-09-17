import type { EventStatus, SimulationStatus, DayStatus, MarketStatus, HealthStatus } from '../../../types/admin';

type AnyStatus = EventStatus | SimulationStatus | DayStatus | MarketStatus | HealthStatus | string;

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  // Event
  SETUP:     { label: 'Setup',    className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]', dot: 'bg-[color:var(--foreground-muted)]' },
  READY:     { label: 'Ready',    className: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]',                  dot: 'bg-[color:var(--accent)]' },
  RUNNING:   { label: 'Running',  className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)] animate-pulse' },
  PAUSED:    { label: 'Paused',   className: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)]',                dot: 'bg-[color:var(--warning)]' },
  ENDED:     { label: 'Ended',    className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  // Simulation
  STOPPED:   { label: 'Stopped',  className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]', dot: 'bg-[color:var(--foreground-muted)]' },
  // Day
  PRE_OPEN:  { label: 'Pre-Open', className: 'bg-[color:var(--accent)]/10 text-[color:var(--accent)]',                  dot: 'bg-[color:var(--accent)]' },
  OPEN:      { label: 'Open',     className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)] animate-pulse' },
  CLOSED:    { label: 'Closed',   className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]', dot: 'bg-[color:var(--foreground-muted)]' },
  // Market
  HALTED:    { label: 'Halted',   className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  // Health
  HEALTHY:   { label: 'Healthy',  className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)]' },
  WARNING:   { label: 'Warning',  className: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)]',                dot: 'bg-[color:var(--warning)]' },
  DEGRADED:  { label: 'Degraded', className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  OFFLINE:   { label: 'Offline',  className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]', dot: 'bg-[color:var(--foreground-muted)]' },
  // Participant
  ACTIVE:    { label: 'Active',   className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)]' },
  DISABLED:  { label: 'Disabled', className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  // Order
  PENDING:   { label: 'Pending',  className: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)]',                dot: 'bg-[color:var(--warning)] animate-pulse' },
  ACCEPTED:  { label: 'Accepted', className: 'bg-[color:var(--accent)]/15 text-[color:var(--accent)]',                  dot: 'bg-[color:var(--accent)]' },
  FILLED:    { label: 'Filled',   className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)]' },
  REJECTED:  { label: 'Rejected', className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  FAILED:    { label: 'Failed',   className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
  CANCELLED: { label: 'Cancelled',className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]', dot: 'bg-[color:var(--foreground-muted)]' },
  // News
  VALID:     { label: 'Valid',    className: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',                dot: 'bg-[color:var(--success)]' },
  INVALID:   { label: 'Invalid',  className: 'bg-[color:var(--danger)]/15 text-[color:var(--danger)]',                  dot: 'bg-[color:var(--danger)]' },
};

interface StatusBadgeProps {
  status: AnyStatus;
  /** When true, shows the animated dot indicator */
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, showDot = true, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-[color:var(--surface-muted)] text-[color:var(--foreground-secondary)]',
    dot: 'bg-[color:var(--foreground-muted)]',
  };

  const sizeClass = size === 'md'
    ? 'px-2.5 py-1 text-xs gap-1.5'
    : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${cfg.className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

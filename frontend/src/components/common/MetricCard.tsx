interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: 'default' | 'success' | 'danger';
}

export default function MetricCard({ label, value, sub, valueColor = 'default' }: MetricCardProps) {
  const valueClass =
    valueColor === 'success'
      ? 'text-[color:var(--success)]'
      : valueColor === 'danger'
        ? 'text-[color:var(--danger)]'
        : 'text-[color:var(--foreground)]';

  return (
    <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--foreground-muted)]">
        {label}
      </p>
      <p className={`text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub && (
        <p className="text-xs text-[color:var(--foreground-muted)] tabular-nums">{sub}</p>
      )}
    </div>
  );
}

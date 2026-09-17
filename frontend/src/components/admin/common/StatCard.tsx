interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  accent?: boolean;
}

export default function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent ? 'bg-[color:var(--accent)]/8 border-[color:var(--accent)]/20' : 'bg-[color:var(--surface)] border-[color:var(--border)]'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)]">{label}</p>
        {icon && <span className="text-[color:var(--foreground-muted)]">{icon}</span>}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[color:var(--foreground-muted)]">{sub}</p>}
    </div>
  );
}

interface LoadingStateProps {
  lines?: number;
}

export default function LoadingState({ lines = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-[color:var(--surface-muted)]"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-16 rounded bg-[color:var(--surface-muted)]" />
        <div className="h-4 w-10 rounded bg-[color:var(--surface-muted)]" />
      </div>
      <div className="h-6 w-24 rounded bg-[color:var(--surface-muted)]" />
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-[color:var(--surface-muted)]" />
        <div className="h-3 w-14 rounded bg-[color:var(--surface-muted)]" />
      </div>
    </div>
  );
}

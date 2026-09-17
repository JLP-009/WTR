interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      {icon && (
        <div className="text-[color:var(--foreground-muted)] mb-1">{icon}</div>
      )}
      <p className="text-sm font-medium text-[color:var(--foreground-secondary)]">{title}</p>
      {description && (
        <p className="text-xs text-[color:var(--foreground-muted)] max-w-[240px] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

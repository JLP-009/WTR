import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import StatusBadge from '../common/StatusBadge';
import type { AdminEventState } from '../../../types/admin';

interface AdminHeaderProps {
  eventState: AdminEventState | null;
  breadcrumbs?: { label: string; active?: boolean }[];
  onMenuToggle: () => void;
}

export default function AdminHeader({ eventState, breadcrumbs, onMenuToggle }: AdminHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] sticky top-0 z-30 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        aria-label="Open menu"
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-muted)] transition-colors"
      >
        <Menu size={17} />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[color:var(--foreground-muted)]">/</span>}
                <span
                  className={
                    crumb.active
                      ? 'text-[color:var(--foreground)] font-medium'
                      : 'text-[color:var(--foreground-secondary)]'
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <span className="text-xs text-[color:var(--foreground-secondary)]">Admin</span>
        )}
      </div>

      {/* Live status indicators */}
      {eventState && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--foreground-muted)] font-medium">
            <span>Event</span>
            <StatusBadge status={eventState.event_status} showDot />
          </div>
          <div className="w-px h-4 bg-[color:var(--border)]" />
          <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--foreground-muted)] font-medium">
            <span>Market</span>
            <StatusBadge status={eventState.market_status} showDot />
          </div>
          {eventState.event_status === 'RUNNING' && (
            <>
              <div className="w-px h-4 bg-[color:var(--border)]" />
              <span className="text-[10px] font-mono text-[color:var(--foreground-secondary)]">
                D{eventState.simulation_day}/{eventState.configured_total_simulation_days} · {eventState.simulation_time}
              </span>
            </>
          )}
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)] transition-colors"
      >
        {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}

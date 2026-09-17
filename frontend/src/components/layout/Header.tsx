import { Trophy } from 'lucide-react';
import ClubLogo from '../branding/ClubLogo';
import ThemeToggle from '../navigation/ThemeToggle';
import type { Route } from '../../App';

interface HeaderProps {
  onNavigate: (route: Route) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] sticky top-0 z-40">
      <div className="flex items-center gap-2.5">
        <ClubLogo size={28} className="text-[color:var(--accent)]" />
        <span className="text-sm font-semibold tracking-[0.12em] text-[color:var(--foreground)] uppercase">
          Warangal
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('leaderboard')}
          aria-label="Leaderboard"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:text-[color:var(--accent)] hover:bg-[color:var(--surface-muted)] transition-colors"
        >
          <Trophy size={17} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

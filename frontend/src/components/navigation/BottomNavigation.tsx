import { Briefcase, CandlestickChart, TrendingUp, Wallet } from 'lucide-react';
import type { Route } from '../../App';

interface BottomNavigationProps {
  current: Route;
  onNavigate: (route: Route) => void;
}

const TABS = [
  { route: 'positions' as Route, label: 'Positions', Icon: Briefcase },
  { route: 'chart' as Route, label: 'Chart', Icon: CandlestickChart },
  { route: 'pnl' as Route, label: 'P&L', Icon: TrendingUp },
  { route: 'balance' as Route, label: 'Balance', Icon: Wallet },
];

export default function BottomNavigation({ current, onNavigate }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[color:var(--surface)] border-t border-[color:var(--border)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex max-w-lg mx-auto">
        {TABS.map(({ route, label, Icon }) => {
          const active = current === route;
          return (
            <button
              key={route}
              onClick={() => onNavigate(route)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors"
            >
              <Icon
                size={20}
                className={active ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground-muted)]'}
              />
              <span
                className={`text-[10px] font-medium tracking-wide uppercase ${
                  active ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground-muted)]'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

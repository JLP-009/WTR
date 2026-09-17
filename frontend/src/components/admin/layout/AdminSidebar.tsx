import {
  LayoutDashboard, Zap, Database, Activity, BarChart3,
  Users, ShoppingCart, Briefcase, Trophy, Newspaper,
  Monitor, ClipboardList, LogOut, ChevronRight, Shield,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { AdminRoute } from '../../../admin/AdminApp';

interface AdminSidebarProps {
  current: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onClose?: () => void;
}

const NAV_GROUPS: {
  label?: string;
  items: { route: AdminRoute; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[];
}[] = [
  {
    items: [
      { route: 'dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
      { route: 'event',       label: 'Event Control', Icon: Zap },
      { route: 'dataset',     label: 'Dataset',      Icon: Database },
    ],
  },
  {
    label: 'Simulation',
    items: [
      { route: 'simulation',  label: 'Simulation',   Icon: Activity },
      { route: 'market',      label: 'Market',       Icon: BarChart3 },
    ],
  },
  {
    label: 'Participants',
    items: [
      { route: 'participants', label: 'Participants', Icon: Users },
      { route: 'orders',       label: 'Orders',      Icon: ShoppingCart },
      { route: 'positions',    label: 'Positions',   Icon: Briefcase },
      { route: 'leaderboard',  label: 'Leaderboard', Icon: Trophy },
    ],
  },
  {
    label: 'Operations',
    items: [
      { route: 'news',      label: 'News',      Icon: Newspaper },
      { route: 'monitoring',label: 'Monitoring', Icon: Monitor },
      { route: 'audit',     label: 'Audit Log', Icon: ClipboardList },
    ],
  },
];

export default function AdminSidebar({ current, onNavigate, onClose }: AdminSidebarProps) {
  const { logout } = useAuth();

  const handleNav = (route: AdminRoute) => {
    onNavigate(route);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[color:var(--border)] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[color:var(--danger)]/15 flex items-center justify-center">
          <Shield size={14} className="text-[color:var(--danger)]" />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--foreground)] uppercase leading-tight">
            Warangal
          </p>
          <p className="text-[9px] font-medium tracking-widest text-[color:var(--danger)] uppercase leading-tight">
            Admin
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)] px-3 pb-1.5">
                {group.label}
              </p>
            )}
            {group.items.map(({ route, label, Icon }) => {
              const active = current === route;
              return (
                <button
                  key={route}
                  onClick={() => handleNav(route)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[color:var(--accent)]/12 text-[color:var(--accent)]'
                      : 'text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]'
                  }`}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{label}</span>
                  {active && <ChevronRight size={12} className="opacity-50" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-[color:var(--border)] p-3">
        <button
          onClick={() => { logout(); onClose?.(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[color:var(--foreground-secondary)] hover:text-[color:var(--danger)] hover:bg-[color:var(--danger)]/8 transition-colors"
        >
          <LogOut size={14} />
          Exit Admin
        </button>
      </div>
    </div>
  );
}

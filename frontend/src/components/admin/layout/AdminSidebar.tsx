import { useState } from 'react';
import {
  LayoutDashboard, Zap, Database, Activity, BarChart3,
  Users, ShoppingCart, Briefcase, Trophy, Newspaper,
  Monitor, ClipboardList, LogOut, ChevronRight, Shield, RotateCcw, Award,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { AdminRoute } from '../../../admin/AdminApp';
import ConfirmDialog from '../common/ConfirmDialog';
import { resetAdminTrades } from '../../../lib/api/admin';

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
      { route: 'rankings',     label: 'Final Rankings', Icon: Award },
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleNav = (route: AdminRoute) => {
    onNavigate(route);
    onClose?.();
  };

  const handleResetTrades = async () => {
    setResetLoading(true);
    setResetError('');
    try {
      await resetAdminTrades();
      setResetDialogOpen(false);
      setResetSuccess('Trades & portfolios reset successfully!');
      window.dispatchEvent(new CustomEvent('wtr:admin-reset'));
      setTimeout(() => setResetSuccess(''), 4000);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[color:var(--border)] flex-shrink-0">
        <img src="/logo.png" alt="WTR 2.0" className="w-8 h-8 object-contain shrink-0" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-wider text-[color:var(--foreground)] uppercase">
              WTR
            </span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black bg-[color:var(--accent)] text-white">
              2.0
            </span>
          </div>
          <p className="text-[9px] font-bold tracking-widest text-[color:var(--danger)] uppercase leading-tight mt-0.5">
            Admin Portal
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
      <div className="flex-shrink-0 border-t border-[color:var(--border)] p-3 space-y-2">
        {resetSuccess && (
          <p className="text-[10px] font-semibold text-[color:var(--success)] bg-[color:var(--success)]/10 px-2 py-1 rounded text-center">
            {resetSuccess}
          </p>
        )}
        {resetError && (
          <p className="text-[10px] font-semibold text-[color:var(--danger)] bg-[color:var(--danger)]/10 px-2 py-1 rounded text-center">
            {resetError}
          </p>
        )}

        <button
          onClick={() => setResetDialogOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/25 transition-colors"
          title="Reset all trades, orders, and participant portfolios"
        >
          <RotateCcw size={14} className="text-[color:var(--danger)] shrink-0" />
          <span className="flex-1 text-left">Reset Trades & Portfolios</span>
        </button>

        <button
          onClick={() => { logout(); onClose?.(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[color:var(--foreground-secondary)] hover:text-[color:var(--danger)] hover:bg-[color:var(--danger)]/8 transition-colors"
        >
          <LogOut size={14} />
          Exit Admin
        </button>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => !resetLoading && setResetDialogOpen(false)}
        onConfirm={handleResetTrades}
        title="Reset All Trades & Portfolios?"
        description="This will permanently clear all orders, executions, positions, audit logs, and news, and reset all participant portfolios back to ₹10,00,000 starting cash. This action cannot be undone."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        destructive
        loading={resetLoading}
      />
    </div>
  );
}

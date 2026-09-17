import { useState } from 'react';
import { Briefcase, CandlestickChart, TrendingUp, Wallet, LayoutDashboard, Trophy } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/login/LoginPage';
import Header from './components/layout/Header';
import BottomNavigation from './components/navigation/BottomNavigation';
import PageContainer from './components/layout/PageContainer';
import DashboardPage from './components/dashboard/DashboardPage';
import PositionsPage from './components/positions/PositionsPage';
import ChartPage from './components/chart/ChartPage';
import PnlPage from './components/pnl/PnlPage';
import BalancePage from './components/balance/BalancePage';
import LeaderboardPage from './components/leaderboard/LeaderboardPage';
import AdminApp from './admin/AdminApp';

export type Route = 'dashboard' | 'positions' | 'chart' | 'pnl' | 'balance' | 'leaderboard';

const SIDEBAR_ITEMS: {
  route: Route;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { route: 'dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
  { route: 'positions',   label: 'Positions',   Icon: Briefcase },
  { route: 'chart',       label: 'Chart',       Icon: CandlestickChart },
  { route: 'pnl',         label: 'P&L',         Icon: TrendingUp },
  { route: 'balance',     label: 'Balance',     Icon: Wallet },
  { route: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
];

function AppContent() {
  const { isAuthenticated, participant } = useAuth();
  const [route, setRoute] = useState<Route>('dashboard');
  const [prevRoute, setPrevRoute] = useState<Route>('dashboard');

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setRoute('dashboard')} />;
  }

  // Admin users go to the isolated admin panel — no participant UI is rendered for them
  if (participant?.role === 'ADMIN') {
    return <AdminApp />;
  }

  const handleNavigate = (r: Route) => {
    setPrevRoute(route);
    setRoute(r);
  };

  const handleBack = () => setRoute(prevRoute === 'leaderboard' ? 'dashboard' : prevRoute);

  return (
    <div className="flex flex-col h-full bg-[color:var(--background)]">
      <Header onNavigate={handleNavigate} />

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Desktop sidebar — never shows admin links */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface)] py-6 gap-1 px-3">
          {SIDEBAR_ITEMS.map(({ route: r, label, Icon }) => {
            const active = route === r;
            return (
              <button
                key={r}
                onClick={() => handleNavigate(r)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[color:var(--surface-muted)] text-[color:var(--accent)]'
                    : 'text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]'
                }`}
              >
                <Icon size={16} className={active ? 'text-[color:var(--accent)]' : ''} />
                {label}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 overflow-hidden flex flex-col">
          <PageContainer>
            {route === 'dashboard'   && <DashboardPage onNavigate={handleNavigate} />}
            {route === 'positions'   && <PositionsPage />}
            {route === 'chart'       && <ChartPage />}
            {route === 'pnl'         && <PnlPage />}
            {route === 'balance'     && <BalancePage />}
            {route === 'leaderboard' && <LeaderboardPage onBack={handleBack} />}
          </PageContainer>
        </div>
      </div>

      <div className="md:hidden">
        <BottomNavigation
          current={(['positions', 'chart', 'pnl', 'balance'] as Route[]).includes(route) ? route : 'dashboard' as Route}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

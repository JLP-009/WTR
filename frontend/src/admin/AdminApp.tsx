import { useState } from 'react';
import AdminLayout from '../components/admin/layout/AdminLayout';
import AdminDashboard from '../components/admin/pages/AdminDashboard';
import EventControlPage from '../components/admin/pages/EventControlPage';
import DatasetPage from '../components/admin/pages/DatasetPage';
import SimulationPage from '../components/admin/pages/SimulationPage';
import MarketPage from '../components/admin/pages/MarketPage';
import ParticipantsPage from '../components/admin/pages/ParticipantsPage';
import OrdersPage from '../components/admin/pages/OrdersPage';
import PositionsPage from '../components/admin/pages/PositionsPage';
import AdminLeaderboardPage from '../components/admin/pages/AdminLeaderboardPage';
import NewsPage from '../components/admin/pages/NewsPage';
import MonitoringPage from '../components/admin/pages/MonitoringPage';
import AuditLogPage from '../components/admin/pages/AuditLogPage';

export type AdminRoute =
  | 'dashboard'
  | 'event'
  | 'dataset'
  | 'simulation'
  | 'market'
  | 'participants'
  | 'orders'
  | 'positions'
  | 'leaderboard'
  | 'news'
  | 'monitoring'
  | 'audit';

const ROUTE_META: Record<AdminRoute, { label: string; breadcrumbs: { label: string; active?: boolean }[] }> = {
  dashboard:    { label: 'Dashboard',    breadcrumbs: [{ label: 'Admin' }, { label: 'Dashboard', active: true }] },
  event:        { label: 'Event',        breadcrumbs: [{ label: 'Admin' }, { label: 'Event Control', active: true }] },
  dataset:      { label: 'Dataset',      breadcrumbs: [{ label: 'Admin' }, { label: 'Dataset', active: true }] },
  simulation:   { label: 'Simulation',   breadcrumbs: [{ label: 'Admin' }, { label: 'Simulation', active: true }] },
  market:       { label: 'Market',       breadcrumbs: [{ label: 'Admin' }, { label: 'Market', active: true }] },
  participants: { label: 'Participants', breadcrumbs: [{ label: 'Admin' }, { label: 'Participants', active: true }] },
  orders:       { label: 'Orders',       breadcrumbs: [{ label: 'Admin' }, { label: 'Orders', active: true }] },
  positions:    { label: 'Positions',    breadcrumbs: [{ label: 'Admin' }, { label: 'Positions', active: true }] },
  leaderboard:  { label: 'Leaderboard', breadcrumbs: [{ label: 'Admin' }, { label: 'Leaderboard', active: true }] },
  news:         { label: 'News',         breadcrumbs: [{ label: 'Admin' }, { label: 'News', active: true }] },
  monitoring:   { label: 'Monitoring',  breadcrumbs: [{ label: 'Admin' }, { label: 'Monitoring', active: true }] },
  audit:        { label: 'Audit Log',   breadcrumbs: [{ label: 'Admin' }, { label: 'Audit Log', active: true }] },
};

export default function AdminApp() {
  const [route, setRoute] = useState<AdminRoute>('dashboard');
  const meta = ROUTE_META[route];

  return (
    <AdminLayout
      current={route}
      onNavigate={setRoute}
      breadcrumbs={meta.breadcrumbs}
    >
      {route === 'dashboard'   && <AdminDashboard onNavigate={setRoute} />}
      {route === 'event'       && <EventControlPage />}
      {route === 'dataset'     && <DatasetPage />}
      {route === 'simulation'  && <SimulationPage />}
      {route === 'market'      && <MarketPage />}
      {route === 'participants' && <ParticipantsPage />}
      {route === 'orders'      && <OrdersPage />}
      {route === 'positions'   && <PositionsPage />}
      {route === 'leaderboard' && <AdminLeaderboardPage />}
      {route === 'news'        && <NewsPage />}
      {route === 'monitoring'  && <MonitoringPage />}
      {route === 'audit'       && <AuditLogPage />}
    </AdminLayout>
  );
}

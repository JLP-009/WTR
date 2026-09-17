import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import type { AdminRoute } from '../../../admin/AdminApp';
import type { AdminEventState } from '../../../types/admin';
import { getAdminEvent } from '../../../lib/api/admin';

interface AdminLayoutProps {
  children: React.ReactNode;
  current: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  breadcrumbs?: { label: string; active?: boolean }[];
}

export default function AdminLayout({ children, current, onNavigate, breadcrumbs }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [eventState, setEventState] = useState<AdminEventState | null>(null);

  // Fetch event state for header indicators; refresh every 30s
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const s = await getAdminEvent();
        if (mounted) setEventState(s);
      } catch { /* silent — header indicator is non-critical */ }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => setMobileOpen(false), [current]);

  return (
    <div className="flex h-full bg-[color:var(--background)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface)]">
        <AdminSidebar current={current} onNavigate={onNavigate} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative w-64 bg-[color:var(--surface)] border-r border-[color:var(--border)] flex flex-col shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-3.5 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-muted)] transition-colors z-10"
            >
              <X size={15} />
            </button>
            <AdminSidebar current={current} onNavigate={onNavigate} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader
          eventState={eventState}
          breadcrumbs={breadcrumbs}
          onMenuToggle={() => setMobileOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

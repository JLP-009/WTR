import { useState, useEffect } from 'react';
import { Trophy, Bell, X, Info, AlertTriangle, Radio, Sparkles } from 'lucide-react';
import ClubLogo from '../branding/ClubLogo';
import ThemeToggle from '../navigation/ThemeToggle';
import type { Route } from '../../App';
import { api } from '../../lib/api/client';
import { wsClient } from '../../lib/websocket';

interface HeaderProps {
  onNavigate: (route: Route) => void;
}

interface NewsItem {
  news_id: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'MARKET_UPDATE' | 'EVENT_UPDATE' | 'ANNOUNCEMENT';
  title: string;
  body: string;
  published_at: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: typeof Info }> = {
  INFO:          { bg: 'bg-[color:var(--accent)]/10', text: 'text-[color:var(--accent)]', icon: Info },
  MARKET_UPDATE: { bg: 'bg-[color:var(--accent)]/10', text: 'text-[color:var(--accent)]', icon: Radio },
  EVENT_UPDATE:  { bg: 'bg-[color:var(--success)]/10', text: 'text-[color:var(--success)]', icon: Sparkles },
  WARNING:       { bg: 'bg-[color:var(--warning)]/10', text: 'text-[color:var(--warning)]', icon: AlertTriangle },
  CRITICAL:      { bg: 'bg-[color:var(--danger)]/10', text: 'text-[color:var(--danger)]', icon: AlertTriangle },
  ANNOUNCEMENT:  { bg: 'bg-[color:var(--accent)]/10', text: 'text-[color:var(--accent)]', icon: Info },
};

function relTime(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeToast, setActiveToast] = useState<NewsItem | null>(null);

  useEffect(() => {
    // Initial fetch of news
    api.get<NewsItem[]>('/news')
      .then((items) => {
        if (Array.isArray(items)) {
          setNews(items);
          if (items.length > 0) setHasUnread(true);
        }
      })
      .catch(() => {});

    // Live news stream via WebSocket
    const unsub = wsClient.subscribe('news', (incoming: NewsItem) => {
      setNews((prev) => [incoming, ...prev.filter((n) => n.news_id !== incoming.news_id)]);
      setHasUnread(true);
      setActiveToast(incoming);
    });

    return () => unsub();
  }, []);

  // Auto-dismiss active toast after 10 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const handleOpen = () => {
    setOpen(true);
    setHasUnread(false);
    setActiveToast(null);
  };

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 border-b border-[color:var(--border)] bg-[color:var(--surface)] sticky top-0 z-40">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <ClubLogo size={32} />
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black tracking-wider text-[color:var(--foreground)] uppercase">
              WTR
            </span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-wider bg-[color:var(--accent)] text-white">
              2.0
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Notifications Bell */}
          <button
            onClick={handleOpen}
            aria-label="Notifications"
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:text-[color:var(--accent)] hover:bg-[color:var(--surface-muted)] transition-colors"
          >
            <Bell size={17} />
            {hasUnread && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[color:var(--accent)] ring-2 ring-[color:var(--surface)] animate-pulse" />
            )}
          </button>

          {/* Leaderboard Button */}
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

      {/* Real-Time News Toast Popup */}
      {activeToast && (
        <div className="fixed top-16 right-4 sm:right-6 max-w-md w-[calc(100vw-2rem)] z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          {(() => {
            const style = TYPE_STYLES[activeToast.type] || TYPE_STYLES.INFO;
            const Icon = style.icon;
            const borderClass =
              activeToast.type === 'CRITICAL' ? 'border-[color:var(--danger)] ring-2 ring-[color:var(--danger)]/30' :
              activeToast.type === 'WARNING' ? 'border-[color:var(--warning)] ring-2 ring-[color:var(--warning)]/30' :
              activeToast.type === 'EVENT_UPDATE' ? 'border-[color:var(--success)] ring-2 ring-[color:var(--success)]/30' :
              'border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20';

            return (
              <div className={`p-4 rounded-2xl bg-[color:var(--surface)] border-2 ${borderClass} shadow-2xl backdrop-blur-md flex flex-col gap-2 relative overflow-hidden`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${style.bg} ${style.text}`}>
                      <Icon size={12} />
                      {activeToast.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-medium text-[color:var(--foreground-muted)]">
                      Just Now
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveToast(null)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-muted)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[color:var(--foreground)] leading-tight">
                    {activeToast.title}
                  </h4>
                  <p className="text-xs text-[color:var(--foreground-secondary)] mt-1 line-clamp-3">
                    {activeToast.body}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    onClick={handleOpen}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)] transition-colors"
                  >
                    View All News
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Slide-out Notification Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="relative w-full max-w-sm bg-[color:var(--surface)] border-l border-[color:var(--border)] h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-[color:var(--border)]">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[color:var(--accent)]" />
                <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Notifications & Updates</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-muted)] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {news.length === 0 ? (
                <div className="text-center py-12 text-[color:var(--foreground-muted)] space-y-2">
                  <Bell size={24} className="mx-auto opacity-40" />
                  <p className="text-xs">No notifications yet.</p>
                </div>
              ) : (
                news.map((item) => {
                  const style = TYPE_STYLES[item.type] || TYPE_STYLES.INFO;
                  const Icon = style.icon;
                  return (
                    <div
                      key={item.news_id}
                      className="p-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]/50 hover:bg-[color:var(--surface-muted)] transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${style.bg} ${style.text}`}>
                            <Icon size={10} />
                            {item.type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-[color:var(--foreground-muted)] whitespace-nowrap">
                          {relTime(item.published_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[color:var(--foreground)] leading-snug">
                        {item.title}
                      </p>
                      <p className="text-xs text-[color:var(--foreground-secondary)] leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

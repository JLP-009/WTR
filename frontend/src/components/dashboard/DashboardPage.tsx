import { useEffect, useState } from 'react';
import { ArrowUpRight, Circle } from 'lucide-react';
import { getPortfolioSummary } from '../../lib/api/portfolio';
import { getMarketState } from '../../lib/api/market';
import { getLeaderboard } from '../../lib/api/leaderboard';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';
import type { MarketState } from '../../contracts/v1/market';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonCard } from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import type { Route } from '../../App';

import { api } from '../../lib/api/client';
import { wsClient } from '../../lib/websocket';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n));
}

interface NewsItem {
  news_id: string;
  type: string;
  title: string;
  body: string;
  published_at: string;
}

interface DashboardPageProps {
  onNavigate: (r: Route) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { participant } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [market, setMarket] = useState<MarketState | null>(null);
  const [rank, setRank] = useState<{ current: number; total: number } | null>(null);
  const [latestNews, setLatestNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, m, lb, newsList] = await Promise.all([
        getPortfolioSummary(),
        getMarketState(),
        getLeaderboard(participant?.participantId),
        api.get<NewsItem[]>('/news').catch(() => []),
      ]);
      setPortfolio(p);
      setMarket(m);
      setRank({ current: lb.currentUserRank, total: lb.totalParticipants });
      if (Array.isArray(newsList) && newsList.length > 0) {
        setLatestNews(newsList[0]);
      }
    } catch {
      setError('Unable to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubNews = wsClient.subscribe('news', (incoming: NewsItem) => {
      setLatestNews(incoming);
    });
    const unsubPort = wsClient.subscribe('portfolio', (payload: any) => {
      const data = payload?.data || payload;
      if (data && (data.totalPnl !== undefined || data.total_pnl !== undefined)) {
        setPortfolio(data);
      } else {
        getPortfolioSummary().then(setPortfolio).catch(() => {});
      }
    });
    const unsubMarket = wsClient.subscribe('market', (tick: any) => {
      if (tick && (tick.symbol === 'NIFTY' || tick.symbol === 'NIFTY 50')) {
        const ltp = parseFloat(tick.last_price ?? tick.ltp ?? tick.close_price);
        const change = parseFloat(tick.change ?? '0');
        const changePct = parseFloat(tick.change_percent ?? tick.changePct ?? '0');
        if (!isNaN(ltp)) {
          setMarket({
            symbol: 'NIFTY',
            status: 'LIVE',
            ltp,
            change,
            changePct,
          });
        }
      }
    });

    return () => {
      unsubNews();
      unsubPort();
      unsubMarket();
    };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="pt-1">
        <p className="text-xs text-[color:var(--foreground-muted)] uppercase tracking-widest">{greeting}</p>
        <h2 className="text-2xl font-semibold text-[color:var(--foreground)] mt-0.5">
          {participant?.displayName ?? 'Trader'}
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : portfolio && market && rank ? (
        <>
          {/* P&L Hero */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-3">
              Total P&L
            </p>
            <div className="flex items-end gap-3">
              <span
                className={`text-4xl font-bold tabular-nums leading-none ${
                  portfolio.totalPnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'
                }`}
              >
                {portfolio.totalPnl >= 0 ? '+' : '−'}₹{fmt(portfolio.totalPnl)}
              </span>
              <span
                className={`text-sm font-medium tabular-nums mb-0.5 ${
                  portfolio.totalPnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'
                }`}
              >
                {portfolio.totalPnl >= 0 ? '+' : '−'}{Math.abs(portfolio.totalPnlPct).toFixed(2)}%
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-[color:var(--border)] flex justify-between items-center">
              <div>
                <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Today</p>
                <p className={`text-sm font-medium tabular-nums ${portfolio.todayPnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
                  {portfolio.todayPnl >= 0 ? '+' : '−'}₹{fmt(portfolio.todayPnl)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">Win Rate</p>
                <p className="text-sm font-medium text-[color:var(--foreground)] tabular-nums">{portfolio.winRate}%</p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-1">
              Current Balance
            </p>
            <p className="text-3xl font-bold text-[color:var(--foreground)] tabular-nums">
              ₹{fmt(portfolio.currentBalance)}
            </p>
          </div>

          {/* Market + Rank row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Market */}
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-2">
                Market
              </p>
              <div className="flex items-center gap-1.5 mb-1">
                <Circle
                  size={7}
                  className={market.status === 'LIVE' ? 'text-[color:var(--success)] fill-current' : 'text-[color:var(--foreground-muted)] fill-current'}
                />
                <span className={`text-xs font-semibold tracking-wide ${market.status === 'LIVE' ? 'text-[color:var(--success)]' : 'text-[color:var(--foreground-muted)]'}`}>
                  {market.status}
                </span>
              </div>
              <p className="text-xs text-[color:var(--foreground-secondary)] tabular-nums">{market.symbol}</p>
              <p className="text-sm font-semibold text-[color:var(--foreground)] tabular-nums mt-0.5">
                ₹{fmt(market.ltp)}
              </p>
            </div>

            {/* Rank */}
            <button
              onClick={() => onNavigate('leaderboard')}
              className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 text-left hover:border-[color:var(--border-strong)] transition-colors"
            >
              <p className="text-[10px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-2">
                Rank
              </p>
              <p className="text-2xl font-bold text-[color:var(--accent)] tabular-nums leading-none">
                #{rank.current}
              </p>
              <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
                of {rank.total.toLocaleString('en-IN')}
              </p>
            </button>
          </div>

          {/* Quick Access */}
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('positions')}
              className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] transition-colors"
            >
              <span className="text-sm font-medium text-[color:var(--foreground)]">Open Positions</span>
              <ArrowUpRight size={15} className="text-[color:var(--foreground-muted)]" />
            </button>
            <button
              onClick={() => onNavigate('chart')}
              className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] transition-colors"
            >
              <span className="text-sm font-medium text-[color:var(--foreground)]">View Market</span>
              <ArrowUpRight size={15} className="text-[color:var(--foreground-muted)]" />
            </button>
          </div>

          {/* Live Market Announcements */}
          {latestNews && (
            <div className="p-4 rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[color:var(--accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
                <Circle size={8} className="text-[color:var(--accent)] fill-current animate-ping" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent)]">
                    {latestNews.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[color:var(--foreground-muted)]">
                    {new Date(latestNews.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[color:var(--foreground)] truncate">
                  {latestNews.title}
                </p>
                <p className="text-xs text-[color:var(--foreground-secondary)] line-clamp-2">
                  {latestNews.body}
                </p>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

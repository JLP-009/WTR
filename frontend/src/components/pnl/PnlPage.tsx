import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { getPortfolioSummary } from '../../lib/api/portfolio';
import { wsClient } from '../../lib/websocket';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';
import { SkeletonCard } from '../common/LoadingState';
import ErrorState from '../common/ErrorState';
import { useTheme } from '../../contexts/ThemeContext';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n));
}

const PERF_DATA = Array.from({ length: 20 }, (_, i) => ({
  day: i + 1,
  value: 200000 + Math.sin(i * 0.4) * 8000 + i * 1200 + Math.random() * 2000,
}));

interface StatRowProps {
  label: string;
  value: string;
  color?: 'success' | 'danger' | 'default';
}
function StatRow({ label, value, color = 'default' }: StatRowProps) {
  const cls =
    color === 'success' ? 'text-[color:var(--success)]' :
    color === 'danger' ? 'text-[color:var(--danger)]' :
    'text-[color:var(--foreground)]';
  return (
    <div className="flex items-center justify-between py-3 border-b border-[color:var(--border)] last:border-0">
      <span className="text-sm text-[color:var(--foreground-secondary)]">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}

export default function PnlPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setPortfolio(await getPortfolioSummary());
    } catch {
      setError('Unable to load P&L');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = wsClient.subscribe('portfolio', (payload: any) => {
      const data = payload?.data || payload;
      if (data && (data.totalPnl !== undefined || data.total_pnl !== undefined)) {
        setPortfolio(data);
      } else {
        getPortfolioSummary().then(setPortfolio).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[color:var(--foreground)]">P&L</h2>

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : portfolio ? (
        <>
          {/* Total */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-2">
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

            {/* Mini performance chart */}
            <div className="h-16 mt-4 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PERF_DATA}>
                  <defs>
                    <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: isDark ? '#17191E' : '#FFFFFF',
                      border: `1px solid ${isDark ? '#24262C' : '#E5E5DF'}`,
                      borderRadius: 8,
                      fontSize: 11,
                      color: isDark ? '#F4F4F1' : '#181818',
                    }}
                    formatter={(v) => [`₹${new Intl.NumberFormat('en-IN').format(Math.round(Number(v)))}`, 'Portfolio']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--success)"
                    strokeWidth={1.5}
                    fill="url(#pnl-fill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail rows */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl px-4">
            <StatRow
              label="Realized P&L"
              value={`${portfolio.realizedPnl >= 0 ? '+' : '−'}₹${fmt(portfolio.realizedPnl)}`}
              color={portfolio.realizedPnl >= 0 ? 'success' : 'danger'}
            />
            <StatRow
              label="Unrealized P&L"
              value={`${portfolio.unrealizedPnl >= 0 ? '+' : '−'}₹${fmt(portfolio.unrealizedPnl)}`}
              color={portfolio.unrealizedPnl >= 0 ? 'success' : 'danger'}
            />
            <StatRow
              label="Today's P&L"
              value={`${portfolio.todayPnl >= 0 ? '+' : '−'}₹${fmt(portfolio.todayPnl)}`}
              color={portfolio.todayPnl >= 0 ? 'success' : 'danger'}
            />
            <StatRow label="Win Rate" value={`${portfolio.winRate}%`} />
            <StatRow label="Total Trades" value={`${portfolio.totalTrades}`} />
          </div>
        </>
      ) : null}
    </div>
  );
}

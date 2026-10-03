import { useEffect, useState } from 'react';
import { getPortfolioSummary, normalizePortfolioSummary } from '../../lib/api/portfolio';
import { wsClient } from '../../lib/websocket';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';
import { SkeletonCard } from '../common/LoadingState';
import ErrorState from '../common/ErrorState';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n || 0);
}

interface BalanceRowProps {
  label: string;
  value: string;
  prominent?: boolean;
  valueColor?: 'success' | 'danger' | 'default';
}
function BalanceRow({ label, value, prominent = false, valueColor = 'default' }: BalanceRowProps) {
  const valCls =
    valueColor === 'success' ? 'text-[color:var(--success)]' :
    valueColor === 'danger' ? 'text-[color:var(--danger)]' :
    prominent ? 'text-[color:var(--foreground)]' :
    'text-[color:var(--foreground-secondary)]';
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[color:var(--border)] last:border-0">
      <span className={`text-sm ${prominent ? 'font-medium text-[color:var(--foreground)]' : 'text-[color:var(--foreground-secondary)]'}`}>
        {label}
      </span>
      <span className={`tabular-nums font-semibold ${prominent ? 'text-base' : 'text-sm'} ${valCls}`}>
        {value}
      </span>
    </div>
  );
}

export default function BalancePage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setPortfolio(await getPortfolioSummary());
    } catch {
      setError('Unable to load balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = wsClient.subscribe('portfolio', (payload: any) => {
      const data = payload?.data || payload;
      if (data) {
        setPortfolio(normalizePortfolioSummary(data));
      } else {
        getPortfolioSummary().then(setPortfolio).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Balance</h2>

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : portfolio ? (
        <>
          {/* Portfolio value hero */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[color:var(--foreground-muted)] mb-1">
              Portfolio Value
            </p>
            <p className="text-4xl font-bold tabular-nums text-[color:var(--foreground)]">
              ₹{fmt(portfolio.portfolioValue ?? 1000000)}
            </p>
            <p className="text-sm tabular-nums text-[color:var(--success)] mt-1.5 font-medium">
              +{(portfolio.totalReturn ?? 0).toFixed(2)}% total return
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl px-4">
            <BalanceRow label="Available Cash" value={`₹${fmt(portfolio.availableCash ?? 1000000)}`} prominent />
            <BalanceRow label="Invested Value" value={`₹${fmt(portfolio.investedValue ?? 0)}`} prominent />
            <BalanceRow
              label="Total Return"
              value={`+${(portfolio.totalReturn ?? 0).toFixed(2)}%`}
              valueColor="success"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

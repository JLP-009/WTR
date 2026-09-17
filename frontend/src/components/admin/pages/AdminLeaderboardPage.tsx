import { useEffect, useState } from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminLeaderboardMonitor } from '../../../lib/api/admin';
import type { AdminLeaderboard } from '../../../types/admin';

const fmtCur = (s: string) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s));

const pnlColor = (v: string) => {
  const n = parseFloat(v);
  return n > 0 ? 'text-[color:var(--success)]' : n < 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]';
};

const medalFor = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

export default function AdminLeaderboardPage() {
  const [board, setBoard] = useState<AdminLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setBoard(await getAdminLeaderboardMonitor()); }
    catch { setError('Unable to load leaderboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error)   return <div className="p-6"><ErrorState message={error} onRetry={load} /></div>;

  const entries = board?.entries ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--foreground)]">Leaderboard</h1>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
            {board?.total_participants ?? 0} participants · Snapshot {board ? new Date(board.as_of).toLocaleTimeString() : ''}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <p className="text-[11px] text-[color:var(--foreground-muted)] px-1">
        Leaderboard is a read model derived from portfolio data. Rankings may lag real-time portfolio state slightly.
        Admin cannot modify rankings or portfolio values.
      </p>

      {entries.length === 0 ? (
        <EmptyState title="No entries" description="Leaderboard updates as participants trade." icon={<Trophy size={28} />} />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Rank', 'Participant', 'Portfolio Value', 'Total P&L', 'Return %', 'Updated'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${i >= 2 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const medal = medalFor(e.rank);
                  return (
                    <tr
                      key={e.participant_id}
                      className={`border-b border-[color:var(--border)] last:border-0 transition-colors ${
                        e.rank <= 3 ? 'hover:bg-[color:var(--accent)]/5' : 'hover:bg-[color:var(--surface-muted)]'
                      }`}
                    >
                      <td className="px-4 py-3 w-14">
                        <div className="flex items-center gap-1.5">
                          {medal ? (
                            <span className="text-base">{medal}</span>
                          ) : (
                            <span className="text-sm font-bold tabular-nums text-[color:var(--foreground-muted)]">
                              {e.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[color:var(--foreground)]">{e.display_name}</p>
                        <p className="font-mono text-[color:var(--foreground-muted)] text-[10px]">{e.participant_id}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-[color:var(--foreground)]">
                        {fmtCur(e.portfolio_value)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlColor(e.total_pnl)}`}>
                        {parseFloat(e.total_pnl) >= 0 ? '+' : ''}{fmtCur(e.total_pnl)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${pnlColor(e.return_percent)}`}>
                        {parseFloat(e.return_percent) >= 0 ? '+' : ''}{parseFloat(e.return_percent).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-[color:var(--foreground-muted)] whitespace-nowrap">
                        {new Date(e.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {board && (
            <div className="px-4 py-2 border-t border-[color:var(--border)] flex items-center justify-between">
              <p className="text-[10px] text-[color:var(--foreground-muted)]">Version {board.version}</p>
              <p className="text-[10px] text-[color:var(--foreground-muted)]">
                As of {new Date(board.as_of).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

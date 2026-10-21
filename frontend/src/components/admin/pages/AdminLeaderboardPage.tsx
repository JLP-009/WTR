import { useEffect, useState } from 'react';
import { Trophy, RefreshCw, ShieldAlert, Award, Star, Users } from 'lucide-react';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import { getAdminLeaderboardMonitor } from '../../../lib/api/admin';
import type { AdminLeaderboard } from '../../../types/admin';

const fmtCur = (s: string) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s || '0'));

const pnlColor = (v: string) => {
  const n = parseFloat(v || '0');
  return n > 0 ? 'text-[color:var(--success)]' : n < 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--foreground-secondary)]';
};

const medalFor = (rank: number) => {
  if (rank === 1) return { icon: '🥇', label: '1st Place', color: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
  if (rank === 2) return { icon: '🥈', label: '2nd Place', color: 'border-slate-300/40 bg-slate-300/10 text-slate-200' };
  if (rank === 3) return { icon: '🥉', label: '3rd Place', color: 'border-amber-700/40 bg-amber-700/10 text-amber-500' };
  return null;
};

export default function AdminLeaderboardPage() {
  const [board, setBoard] = useState<AdminLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'top10' | 'all'>('top10');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminLeaderboardMonitor();
      setBoard(data);
    } catch {
      setError('Unable to load admin leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const allEntries = board?.entries ?? [];
  const top10Entries = board?.top_10 && board.top_10.length > 0
    ? board.top_10
    : allEntries.slice(0, 10);
  const displayedEntries = viewMode === 'top10' ? top10Entries : allEntries;

  const top3 = top10Entries.slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      {/* Admin Privacy & Security Banner */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>CONFIDENTIAL ADMIN VIEW:</strong> This Top 10 Leaderboard is visible exclusively to Administrators. Regular participants see the conclusion screen.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
          Admin Only
        </span>
      </div>

      {/* Header and Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[color:var(--foreground)]">
              {board?.is_event_ended ? '🏆 Final Leaderboard (Top 10 Finalists)' : 'Official Leaderboard'}
            </h1>
            {board?.is_event_ended && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[color:var(--danger)]/15 text-[color:var(--danger)] border border-[color:var(--danger)]/30">
                Event Ended
              </span>
            )}
          </div>
          <p className="text-xs text-[color:var(--foreground-muted)] mt-1">
            {board?.total_participants ?? 0} participants total · Portfolios evaluated mark-to-market with open positions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-[color:var(--border)] p-0.5 bg-[color:var(--surface)] text-xs">
            <button
              onClick={() => setViewMode('top10')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'top10'
                  ? 'bg-[color:var(--accent)] text-white shadow-sm'
                  : 'text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)]'
              }`}
            >
              <Award size={13} />
              <span>Top 10 Finalists</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-[color:var(--accent)] text-white shadow-sm'
                  : 'text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)]'
              }`}
            >
              <Users size={13} />
              <span>All ({allEntries.length})</span>
            </button>
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium Highlights (when entries exist) */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((entry) => {
            const medal = medalFor(entry.rank);
            return (
              <div
                key={entry.participant_id}
                className={`relative rounded-2xl border p-4.5 bg-[color:var(--surface)] flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                  entry.rank === 1
                    ? 'border-amber-400/50 bg-gradient-to-b from-amber-400/5 to-transparent'
                    : entry.rank === 2
                    ? 'border-slate-300/40 bg-gradient-to-b from-slate-300/5 to-transparent'
                    : 'border-amber-700/40 bg-gradient-to-b from-amber-700/5 to-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-2xl">{medal?.icon}</span>
                    <h3 className="font-bold text-base text-[color:var(--foreground)] mt-1 truncate">
                      {entry.display_name}
                    </h3>
                    <p className="font-mono text-xs text-[color:var(--foreground-muted)]">
                      {entry.participant_id}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${medal?.color}`}>
                    Rank #{entry.rank}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[color:var(--border)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)]">
                      Portfolio Value
                    </p>
                    <p className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">
                      {fmtCur(entry.portfolio_value)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)]">
                      Total P&L
                    </p>
                    <p className={`text-sm font-bold tabular-nums ${pnlColor(entry.total_pnl)}`}>
                      {parseFloat(entry.total_pnl) >= 0 ? '+' : ''}
                      {fmtCur(entry.total_pnl)}
                      <span className="text-[11px] block font-medium">
                        ({parseFloat(entry.return_percent) >= 0 ? '+' : ''}
                        {parseFloat(entry.return_percent).toFixed(2)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard Table */}
      {displayedEntries.length === 0 ? (
        <EmptyState
          title="No entries"
          description="Leaderboard updates as participants trade."
          icon={<Trophy size={28} />}
        />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-[color:var(--foreground)] uppercase tracking-wider">
                {viewMode === 'top10' ? 'Top 10 Finalists Standings' : 'Full Participant Standings'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[color:var(--foreground-muted)]">
              Showing {displayedEntries.length} of {allEntries.length} participants
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]/50">
                  {['Rank', 'Participant', 'Final Portfolio Value', 'Total P&L', 'Return %', 'Trades', 'Last Updated'].map(
                    (h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground-muted)] whitespace-nowrap ${
                          i >= 2 ? 'text-right' : ''
                        }`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((e) => {
                  const medal = medalFor(e.rank);
                  return (
                    <tr
                      key={e.participant_id}
                      className={`border-b border-[color:var(--border)] last:border-0 transition-colors ${
                        e.rank <= 3
                          ? 'bg-[color:var(--accent)]/5 hover:bg-[color:var(--accent)]/10'
                          : e.rank <= 10
                          ? 'hover:bg-[color:var(--surface-muted)]/70'
                          : 'hover:bg-[color:var(--surface-muted)]/40'
                      }`}
                    >
                      <td className="px-4 py-3 w-16">
                        <div className="flex items-center gap-1.5">
                          {medal ? (
                            <span className="text-base" title={medal.label}>{medal.icon}</span>
                          ) : (
                            <span
                              className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                                e.rank <= 10
                                  ? 'bg-[color:var(--surface-muted)] text-[color:var(--foreground)] border border-[color:var(--border)]'
                                  : 'text-[color:var(--foreground-muted)]'
                              }`}
                            >
                              #{e.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[color:var(--foreground)]">{e.display_name}</p>
                          {e.rank <= 10 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Top 10
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[color:var(--foreground-muted)] text-[10px]">{e.participant_id}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-sm text-[color:var(--foreground)]">
                        {fmtCur(e.portfolio_value)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${pnlColor(e.total_pnl)}`}>
                        {parseFloat(e.total_pnl) >= 0 ? '+' : ''}
                        {fmtCur(e.total_pnl)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${pnlColor(e.return_percent)}`}>
                        {parseFloat(e.return_percent) >= 0 ? '+' : ''}
                        {parseFloat(e.return_percent).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)] font-mono">
                        {e.trades_count ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[color:var(--foreground-muted)] whitespace-nowrap font-mono text-[11px]">
                        {new Date(e.updated_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {board && (
            <div className="px-4 py-2.5 border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]/30 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] text-[color:var(--foreground-muted)] font-mono">
                Leaderboard Version {board.version}
              </p>
              <p className="text-[10px] text-[color:var(--foreground-muted)] font-mono">
                Computed As of {new Date(board.as_of).toLocaleTimeString()} · Admin Only Access
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

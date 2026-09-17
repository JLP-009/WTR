import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { mockGetLeaderboard } from '../../mocks/leaderboard';
import type { LeaderboardEntry } from '../../contracts/v1/leaderboard';
import { SkeletonCard } from '../common/LoadingState';
import ErrorState from '../common/ErrorState';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

interface EntryRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  divider?: boolean;
}
function EntryRow({ entry, isCurrentUser, divider }: EntryRowProps) {
  return (
    <>
      {divider && (
        <div className="py-2 flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-[color:var(--border)]" />
          <span className="text-[10px] text-[color:var(--foreground-muted)] uppercase tracking-wider">you</span>
          <div className="flex-1 border-t border-dashed border-[color:var(--border)]" />
        </div>
      )}
      <div
        className={`flex items-center gap-3 py-3 border-b border-[color:var(--border)] last:border-0 ${
          isCurrentUser ? 'bg-[color:var(--surface-muted)] -mx-4 px-4 rounded-lg' : ''
        }`}
      >
        <span
          className={`text-sm font-bold tabular-nums w-8 text-right shrink-0 ${
            entry.rank <= 3 ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground-muted)]'
          }`}
        >
          #{entry.rank}
        </span>
        <span className={`flex-1 text-sm truncate ${isCurrentUser ? 'font-semibold text-[color:var(--foreground)]' : 'text-[color:var(--foreground-secondary)]'}`}>
          {entry.displayName}
        </span>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
            ₹{fmt(entry.portfolioValue)}
          </p>
          <p className={`text-[11px] tabular-nums ${entry.pnl >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]'}`}>
            {entry.pnl >= 0 ? '+' : ''}{entry.pnlPct.toFixed(2)}%
          </p>
        </div>
      </div>
    </>
  );
}

interface LeaderboardPageProps {
  onBack?: () => void;
}

export default function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [data, setData] = useState<{ entries: LeaderboardEntry[]; totalParticipants: number; season: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const lb = await mockGetLeaderboard();
      setData(lb);
    } catch {
      setError('Unable to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const topEntries = data?.entries.filter((e) => !e.isCurrentUser) ?? [];
  const userEntry = data?.entries.find((e) => e.isCurrentUser);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)] transition-colors -ml-1"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Leaderboard</h2>
        </div>
        {data && (
          <span className="text-xs text-[color:var(--foreground-muted)]">{data.season}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((k) => <SkeletonCard key={k} />)}</div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl px-4">
          {topEntries.map((entry) => (
            <EntryRow key={entry.rank} entry={entry} isCurrentUser={false} />
          ))}
          {userEntry && (
            <EntryRow entry={userEntry} isCurrentUser divider />
          )}
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  RefreshCw,
  Search,
  Download,
  Award,
  Users,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import ErrorState from '../../common/ErrorState';
import EmptyState from '../../common/EmptyState';
import { SkeletonCard } from '../../common/LoadingState';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  getAdminLeaderboardMonitor,
  releaseRanks,
  unreleaseRanks,
} from '../../../lib/api/admin';
import type { AdminLeaderboard, AdminLeaderboardEntry } from '../../../types/admin';

const fmtCur = (s: string) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(parseFloat(s || '0'));

const pnlColor = (v: string) => {
  const n = parseFloat(v || '0');
  return n > 0
    ? 'text-[color:var(--success)]'
    : n < 0
    ? 'text-[color:var(--danger)]'
    : 'text-[color:var(--foreground-secondary)]';
};

const medalFor = (rank: number) => {
  if (rank === 1) return { icon: '🥇', label: '1st Place', color: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
  if (rank === 2) return { icon: '🥈', label: '2nd Place', color: 'border-slate-300/40 bg-slate-300/10 text-slate-200' };
  if (rank === 3) return { icon: '🥉', label: '3rd Place', color: 'border-amber-700/40 bg-amber-700/10 text-amber-500' };
  return null;
};

export default function FinalRankingsPage() {
  const [board, setBoard] = useState<AdminLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'top10' | 'profit' | 'loss'>('all');
  const [copied, setCopied] = useState(false);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showUnreleaseConfirm, setShowUnreleaseConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminLeaderboardMonitor();
      setBoard(data);
    } catch {
      setError('Unable to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const allEntries: AdminLeaderboardEntry[] = board?.entries ?? [];

  // Filter and search
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (filter === 'top10') {
      result = result.filter((e) => e.rank <= 10);
    } else if (filter === 'profit') {
      result = result.filter((e) => parseFloat(e.total_pnl || '0') > 0);
    } else if (filter === 'loss') {
      result = result.filter((e) => parseFloat(e.total_pnl || '0') < 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.participant_id.toLowerCase().includes(q) ||
          e.display_name.toLowerCase().includes(q) ||
          String(e.rank) === q
      );
    }

    return result;
  }, [allEntries, filter, search]);

  const handleReleaseRanks = async () => {
    setActionLoading(true);
    try {
      await releaseRanks();
      setShowReleaseConfirm(false);
      setActionSuccess('Ranks released to participants successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to release ranks');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnreleaseRanks = async () => {
    setActionLoading(true);
    try {
      await unreleaseRanks();
      setShowUnreleaseConfirm(false);
      setActionSuccess('Ranks hidden from participants.');
      setTimeout(() => setActionSuccess(''), 4000);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to hide ranks');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const exportCsv = () => {
    if (!allEntries || allEntries.length === 0) return;
    const headers = ['Rank', 'Participant ID', 'Display Name', 'Final Portfolio Value (INR)', 'Total P&L (INR)', 'Return %', 'Trades Count'];
    const rows = allEntries.map((e) => [
      e.rank,
      `"${e.participant_id}"`,
      `"${e.display_name.replace(/"/g, '""')}"`,
      parseFloat(e.portfolio_value || '0').toFixed(2),
      parseFloat(e.total_pnl || '0').toFixed(2),
      parseFloat(e.return_percent || '0').toFixed(2),
      e.trades_count ?? 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wtr_event_final_rankings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

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

  const top1 = allEntries[0];
  const totalParticipants = allEntries.length;
  const profitableCount = allEntries.filter((e) => parseFloat(e.total_pnl || '0') > 0).length;
  const highestReturn = allEntries.reduce(
    (max, e) => Math.max(max, parseFloat(e.return_percent || '0')),
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[color:var(--foreground)]">
                Participant Final Rankings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {board?.is_event_ended ? 'Official Final Standings' : 'Live Standings'}
              </span>
            </div>
            <p className="text-xs text-[color:var(--foreground-muted)] mt-0.5">
              Rank of each participant evaluated mark-to-market. Official reference for closing ceremony announcements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Release Ranks Button */}
          {board?.ranks_released ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={14} />
                <span>Ranks Released (Public)</span>
              </span>
              <button
                onClick={() => setShowUnreleaseConfirm(true)}
                disabled={actionLoading}
                className="px-2.5 py-2 text-xs font-medium rounded-xl border border-[color:var(--border)] text-[color:var(--foreground-muted)] hover:text-[color:var(--danger)] hover:border-[color:var(--danger)]/30 transition-colors"
                title="Hide ranks from participants"
              >
                Hide
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReleaseConfirm(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-400 text-black hover:bg-amber-300 transition-colors shadow-sm"
            >
              <Radio size={14} className="animate-pulse" />
              <span>Release Ranks to Participants</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[color:var(--accent)] text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            {copied ? <CheckCircle2 size={14} /> : <Download size={14} />}
            <span>{copied ? 'CSV Downloaded!' : 'Export CSV'}</span>
          </button>
          <button
            onClick={load}
            aria-label="Refresh rankings"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-[color:var(--border)] text-[color:var(--foreground-secondary)] hover:bg-[color:var(--surface-muted)] transition-colors"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success alert message if any */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--foreground-muted)] mb-1">
            Total Ranked
          </p>
          <p className="text-2xl font-bold text-[color:var(--foreground)] tabular-nums">
            {totalParticipants}
          </p>
          <p className="text-[11px] text-[color:var(--foreground-muted)] mt-0.5">Participants</p>
        </div>

        <div className="bg-[color:var(--surface)] border border-amber-400/30 rounded-xl p-4 bg-gradient-to-br from-amber-400/5 to-transparent">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
            <span>🥇 1st Place Champion</span>
          </p>
          <p className="text-base font-bold text-[color:var(--foreground)] truncate">
            {top1?.display_name || '—'}
          </p>
          <p className="text-xs font-mono text-amber-400/90 font-semibold mt-0.5">
            {top1 ? fmtCur(top1.portfolio_value) : '—'}
          </p>
        </div>

        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--foreground-muted)] mb-1">
            Top Return %
          </p>
          <p className="text-2xl font-bold text-[color:var(--success)] tabular-nums">
            +{highestReturn.toFixed(2)}%
          </p>
          <p className="text-[11px] text-[color:var(--foreground-muted)] mt-0.5">Max participant gain</p>
        </div>

        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--foreground-muted)] mb-1">
            In Net Profit
          </p>
          <p className="text-2xl font-bold text-[color:var(--foreground)] tabular-nums">
            {profitableCount}
          </p>
          <p className="text-[11px] text-[color:var(--foreground-muted)] mt-0.5">
            of {totalParticipants} ({totalParticipants > 0 ? ((profitableCount / totalParticipants) * 100).toFixed(0) : 0}%)
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID (e.g. TRADER-001) or Name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] focus:outline-none focus:border-[color:var(--accent)]"
          />
        </div>

        <div className="flex items-center rounded-xl border border-[color:var(--border)] p-1 bg-[color:var(--surface)] text-xs shrink-0 overflow-x-auto">
          {[
            { id: 'all', label: `All (${allEntries.length})` },
            { id: 'top10', label: 'Top 10' },
            { id: 'profit', label: `In Profit (${profitableCount})` },
            { id: 'loss', label: `In Loss (${totalParticipants - profitableCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-[color:var(--accent)] text-white shadow-xs'
                  : 'text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Complete Rankings Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No participants found"
          description={search ? `No participants match "${search}".` : 'No ranking records available.'}
          icon={<Users size={28} />}
        />
      ) : (
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-[color:var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
              <Award size={14} className="text-amber-400" />
              <span>Full Participant Standings</span>
            </span>
            <span className="text-[11px] font-mono text-[color:var(--foreground-muted)]">
              Showing {filteredEntries.length} of {allEntries.length} participants
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-muted)]/50">
                  {['Rank', 'Participant', 'Final Portfolio Value', 'Total P&L', 'Return %', 'Trades'].map(
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
                {filteredEntries.map((e) => {
                  const medal = medalFor(e.rank);
                  const isTop10 = e.rank <= 10;
                  return (
                    <tr
                      key={e.participant_id}
                      className={`border-b border-[color:var(--border)] last:border-0 transition-colors ${
                        e.rank === 1
                          ? 'bg-amber-400/10 hover:bg-amber-400/15'
                          : e.rank <= 3
                          ? 'bg-[color:var(--accent)]/5 hover:bg-[color:var(--accent)]/10'
                          : isTop10
                          ? 'hover:bg-[color:var(--surface-muted)]/70'
                          : 'hover:bg-[color:var(--surface-muted)]/40'
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="px-4 py-3 w-20">
                        <div className="flex items-center gap-2">
                          {medal ? (
                            <span className="text-lg" title={medal.label}>{medal.icon}</span>
                          ) : (
                            <span
                              className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                                isTop10
                                  ? 'bg-[color:var(--surface-muted)] text-[color:var(--foreground)] border border-[color:var(--border)]'
                                  : 'text-[color:var(--foreground-muted)]'
                              }`}
                            >
                              #{e.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Participant Column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[color:var(--foreground)] text-sm">
                            {e.display_name}
                          </p>
                          {isTop10 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Top 10
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[color:var(--foreground-muted)] text-[11px] mt-0.5">
                          {e.participant_id}
                        </p>
                      </td>

                      {/* Final Portfolio Value Column */}
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-sm text-[color:var(--foreground)]">
                        {fmtCur(e.portfolio_value)}
                      </td>

                      {/* Total P&L Column */}
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${pnlColor(e.total_pnl)}`}>
                        {parseFloat(e.total_pnl) >= 0 ? '+' : ''}
                        {fmtCur(e.total_pnl)}
                      </td>

                      {/* Return % Column */}
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${pnlColor(e.return_percent)}`}>
                        {parseFloat(e.return_percent) >= 0 ? '+' : ''}
                        {parseFloat(e.return_percent).toFixed(2)}%
                      </td>

                      {/* Trades Count Column */}
                      <td className="px-4 py-3 text-right tabular-nums text-[color:var(--foreground-secondary)] font-mono">
                        {e.trades_count ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]/30 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-[color:var(--foreground-muted)] font-mono">
              Total {allEntries.length} participants ranked
            </p>
            <p className="text-[10px] text-[color:var(--foreground-muted)] font-mono">
              Computed As of {board ? new Date(board.as_of).toLocaleTimeString() : '—'} • Admin Confidential
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showReleaseConfirm}
        onClose={() => setShowReleaseConfirm(false)}
        onConfirm={handleReleaseRanks}
        title="Release Final Ranks to Participants?"
        description="This will immediately reveal the official rankings, podium finishes, and positions to all participants on their screens. Are you ready to make results public?"
        confirmLabel="Release Ranks Now"
        loading={actionLoading}
      />

      <ConfirmDialog
        open={showUnreleaseConfirm}
        onClose={() => setShowUnreleaseConfirm(false)}
        onConfirm={handleUnreleaseRanks}
        title="Hide Ranks From Participants?"
        description="This will revert participants' screens back to 'Revealed at the closing ceremony'. You can re-release ranks at any time."
        confirmLabel="Hide Ranks"
        destructive
        loading={actionLoading}
      />
    </div>
  );
}

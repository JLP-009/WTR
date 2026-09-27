import { api } from './client';
import { mockGetLeaderboard } from '../../mocks/leaderboard';
import type { LeaderboardResponse, LeaderboardEntry } from '../../contracts/v1/leaderboard';

interface BackendLeaderboardEntry {
  rank: number;
  user_id: string;
  participant_id: string;
  display_name: string;
  starting_capital: string;
  equity: string;
  total_pnl: string;
  total_pnl_percent: string;
  trades_count: number;
  win_rate: string;
}

export async function getLeaderboard(currentParticipantId?: string): Promise<LeaderboardResponse> {
  try {
    const data = await api.get<BackendLeaderboardEntry[]>('/leaderboard');
    const entries: LeaderboardEntry[] = data.map((e) => ({
      rank: e.rank,
      participantId: e.participant_id,
      displayName: e.display_name,
      portfolioValue: parseFloat(e.equity),
      pnl: parseFloat(e.total_pnl),
      pnlPct: parseFloat(e.total_pnl_percent),
      isCurrentUser: currentParticipantId ? e.participant_id === currentParticipantId : false,
    }));

    const myEntry = entries.find((e) => e.isCurrentUser);

    return {
      totalParticipants: entries.length,
      currentUserRank: myEntry?.rank || 1,
      season: 'Season 01',
      entries,
    };
  } catch {
    return {
      totalParticipants: 0,
      currentUserRank: 1,
      season: 'Season 01',
      entries: [],
    };
  }
}

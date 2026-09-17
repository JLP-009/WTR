import type { LeaderboardResponse } from '../contracts/v1/leaderboard';

export async function mockGetLeaderboard(): Promise<LeaderboardResponse> {
  await delay(400);
  return {
    totalParticipants: 500,
    currentUserRank: 23,
    season: 'Season 01',
    entries: [
      { rank: 1, participantId: 'WAR047', displayName: 'Arjun K.', portfolioValue: 342500, pnl: 92500, pnlPct: 37.0, isCurrentUser: false },
      { rank: 2, participantId: 'WAR112', displayName: 'Priya S.', portfolioValue: 321400, pnl: 71400, pnlPct: 28.56, isCurrentUser: false },
      { rank: 3, participantId: 'WAR203', displayName: 'Rajan M.', portfolioValue: 315800, pnl: 65800, pnlPct: 26.32, isCurrentUser: false },
      { rank: 4, participantId: 'WAR089', displayName: 'Kavitha R.', portfolioValue: 308200, pnl: 58200, pnlPct: 23.28, isCurrentUser: false },
      { rank: 5, participantId: 'WAR334', displayName: 'Suresh D.', portfolioValue: 302700, pnl: 52700, pnlPct: 21.08, isCurrentUser: false },
      { rank: 23, participantId: 'WAR001', displayName: 'You', portfolioValue: 224560, pnl: 24560, pnlPct: 12.45, isCurrentUser: true },
    ],
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// FRONTEND/API CONTRACT DRAFT — v1

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  displayName: string;
  portfolioValue: number;
  pnl: number;
  pnlPct: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: number;
  totalParticipants: number;
  season: string;
}

export type TournamentRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type TournamentRequestDto = {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  prizePool: number;
  fee: number;
  maxPlayers: number;
  gameId: string;
  requestedById: string;
  justification: string;
  adminNotes: string | null;
  status: TournamentRequestStatus;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
};

export interface TournamentRequestsRepository {
  create(input: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date | null;
    prizePool: number;
    fee: number;
    maxPlayers: number;
    gameId: string;
    requestedById: string;
    justification: string;
  }): Promise<{ id: number }>;

  findById(id: number): Promise<TournamentRequestDto | null>;

  review(input: {
    id: number;
    status: 'APPROVED' | 'REJECTED';
    reviewedById: string;
    adminNotes?: string | null;
  }): Promise<void>;
}

import type { TournamentRequestsRepository } from '@/application/ports/tournamentRequestsRepository';
import { NotFoundError } from '@/shared/errors/appErrors';

export type ReviewTournamentRequestInput = {
  id: number;
  reviewedById: string;
  decision: 'APPROVE' | 'REJECT';
  adminNotes?: string | null;
};

export type ReviewTournamentRequestOutput = {
  reviewed: true;
};

export class ReviewTournamentRequest {
  constructor(private readonly tournamentRequestsRepository: TournamentRequestsRepository) {}

  public async execute(input: ReviewTournamentRequestInput): Promise<ReviewTournamentRequestOutput> {
    const existing = await this.tournamentRequestsRepository.findById(input.id);
    if (!existing) throw new NotFoundError('Tournament request not found', { id: input.id });

    await this.tournamentRequestsRepository.review({
      id: input.id,
      status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedById: input.reviewedById,
      adminNotes: input.adminNotes ?? null,
    });

    return { reviewed: true };
  }
}

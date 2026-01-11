import { DomainError, ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import { TournamentStatus } from '@/domain/entities/tournament';

export type ChangeTournamentStatusInput = {
  actor: { userId: string; role: string };
  id: string;
  status: TournamentStatus;
};

export class ChangeTournamentStatus {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  public async execute(input: ChangeTournamentStatusInput): Promise<void> {
    const tournament = await this.tournamentsRepository.findById(input.id);
    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    const primitives = tournament.toPrimitives();
    const isAdmin = input.actor.role === 'ADMIN';
    const isOwner = primitives.organizerUserId === input.actor.userId;

    // Owner can request approval; admin can move other statuses.
    if (input.status === TournamentStatus.PENDING_APPROVAL) {
      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('You cannot request approval for this tournament');
      }
      tournament.requestApproval();
      await this.tournamentsRepository.save(tournament);
      return;
    }

    if (!isAdmin) {
      throw new ForbiddenError('Only admins can change tournament status');
    }

    switch (input.status) {
      case TournamentStatus.SCHEDULED:
        tournament.schedule();
        break;
      case TournamentStatus.RUNNING:
        tournament.start();
        break;
      case TournamentStatus.COMPLETED:
        tournament.complete();
        break;
      case TournamentStatus.CANCELED:
        tournament.cancel();
        break;
      default:
        throw new DomainError('Unsupported status transition');
    }

    await this.tournamentsRepository.save(tournament);
  }
}

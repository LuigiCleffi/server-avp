import { DomainError, ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import { Tournament, TournamentFormat, TournamentStatus } from '@/domain/entities/tournament';

export type UpdateTournamentInput = {
  actor: { userId: string; role: string };
  id: string;
  name?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  fee?: string;
  prizePool?: string;
  format?: TournamentFormat;
  maxParticipants?: number;
};

export class UpdateTournament {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  public async execute(input: UpdateTournamentInput): Promise<void> {
    const tournament = await this.tournamentsRepository.findById(input.id);
    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    const primitives = tournament.toPrimitives();
    const isAdmin = input.actor.role === 'ADMIN';
    const isOwner = primitives.organizerUserId === input.actor.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenError('You cannot update this tournament');
    }

    // Limit updates depending on status (simple, conservative rules)
    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.PENDING_APPROVAL
    ) {
      throw new DomainError('Tournament cannot be updated in the current status');
    }

    // Rebuild the aggregate with updated fields to re-run invariants.
    const nextName = input.name ?? primitives.name;
    const nextDescription = input.description === undefined ? primitives.description : input.description;
    const nextStartDate = input.startDate ?? new Date(primitives.startDate);
    const nextEndDate =
      input.endDate === undefined
        ? primitives.endDate
          ? new Date(primitives.endDate)
          : null
        : input.endDate;
    const nextFee = input.fee ?? primitives.fee;
    const nextPrizePool = input.prizePool ?? primitives.prizePool;
    const nextFormat = input.format ?? primitives.format;
    const nextMaxParticipants = input.maxParticipants ?? primitives.maxParticipants;

    const nextAggregate = Tournament.restore({
      id: primitives.id,
      name: nextName,
      description: nextDescription,
      startDate: nextStartDate,
      endDate: nextEndDate,
      fee: nextFee,
      prizePool: nextPrizePool,
      format: nextFormat,
      maxParticipants: nextMaxParticipants,
      status: primitives.status,
      organizerUserId: primitives.organizerUserId,
      gameId: primitives.gameId,
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(),
    });

    await this.tournamentsRepository.save(nextAggregate);
  }
}

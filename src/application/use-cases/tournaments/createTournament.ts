import { randomUUID } from 'node:crypto';
import { ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import { Tournament, TournamentFormat } from '@/domain/entities/tournament';

export type CreateTournamentInput = {
  actor: { userId: string; role: string };
  name: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date | null;
  fee: string;
  prizePool: string;
  format: TournamentFormat;
  maxParticipants: number;
  gameId: string;
};

export type CreateTournamentOutput = {
  id: string;
};

export class CreateTournament {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly gamesRepository: GamesRepository,
  ) {}

  public async execute(input: CreateTournamentInput): Promise<CreateTournamentOutput> {
    if (!input.actor?.userId) {
      throw new ForbiddenError('Unauthorized');
    }

    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) {
      throw new NotFoundError('Game not found');
    }

    const tournament = Tournament.createNew({
      id: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      fee: input.fee,
      prizePool: input.prizePool,
      format: input.format,
      maxParticipants: input.maxParticipants,
      organizerUserId: input.actor.userId,
      gameId: input.gameId,
    });

    await this.tournamentsRepository.create(tournament);

    return { id: tournament.id };
  }
}

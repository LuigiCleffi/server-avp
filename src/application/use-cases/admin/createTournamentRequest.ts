import type { TournamentRequestsRepository } from '@/application/ports/tournamentRequestsRepository';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import { NotFoundError } from '@/shared/errors/appErrors';

export type CreateTournamentRequestInput = {
  requestedById: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  prizePool: number;
  fee: number;
  maxPlayers: number;
  gameId: string;
  justification: string;
};

export type CreateTournamentRequestOutput = {
  requestId: number;
};

export class CreateTournamentRequest {
  constructor(
    private readonly tournamentRequestsRepository: TournamentRequestsRepository,
    private readonly gamesRepository: GamesRepository,
  ) {}

  public async execute(input: CreateTournamentRequestInput): Promise<CreateTournamentRequestOutput> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) {
      throw new NotFoundError('Game not found', { gameId: input.gameId });
    }

    const created = await this.tournamentRequestsRepository.create({
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      prizePool: input.prizePool,
      fee: input.fee,
      maxPlayers: input.maxPlayers,
      gameId: input.gameId,
      requestedById: input.requestedById,
      justification: input.justification,
    });

    return { requestId: created.id };
  }
}

import { NotFoundError } from '@/shared/errors/appErrors';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import type { TournamentPrimitives } from '@/domain/entities/tournament';

export type GetTournamentDetailsInput = {
  id: string;
};

export type GetTournamentDetailsOutput = TournamentPrimitives;

export class GetTournamentDetails {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  public async execute(input: GetTournamentDetailsInput): Promise<GetTournamentDetailsOutput> {
    const tournament = await this.tournamentsRepository.findById(input.id);
    if (!tournament) {
      throw new NotFoundError('Tournament not found');
    }

    return tournament.toPrimitives();
  }
}

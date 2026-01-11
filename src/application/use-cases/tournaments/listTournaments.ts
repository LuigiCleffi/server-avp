import type {
  ListTournamentsFilter,
  PaginatedResult,
  TournamentsRepository,
} from '@/application/ports/tournamentsRepository';
import type { TournamentPrimitives, TournamentStatus } from '@/domain/entities/tournament';
import type { Tournament } from '@/domain/entities/tournament';

export type ListTournamentsInput = {
  gameId?: string;
  status?: TournamentStatus;
  startFrom?: Date;
  startTo?: Date;
  page: number;
  pageSize: number;
};

export type ListTournamentsOutput = {
  items: TournamentPrimitives[];
  page: number;
  pageSize: number;
  total: number;
};

export class ListTournaments {
  constructor(private readonly tournamentsRepository: TournamentsRepository) {}

  public async execute(input: ListTournamentsInput): Promise<ListTournamentsOutput> {
    const filter: ListTournamentsFilter = {
      gameId: input.gameId,
      status: input.status,
      startFrom: input.startFrom,
      startTo: input.startTo,
    };

    const result: PaginatedResult<Tournament> =
      await this.tournamentsRepository.list(filter, { page: input.page, pageSize: input.pageSize });

    return {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      items: result.items.map((t) => t.toPrimitives()),
    };
  }
}

import type { Tournament } from '@/domain/entities/tournament';
import type { TournamentStatus } from '@/domain/entities/tournament';

export type ListTournamentsFilter = {
  gameId?: string;
  status?: TournamentStatus;
  startFrom?: Date;
  startTo?: Date;
};

export type PaginationInput = {
  page: number;
  pageSize: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export interface TournamentsRepository {
  findById(id: string): Promise<Tournament | null>;
  list(filter: ListTournamentsFilter, pagination: PaginationInput): Promise<PaginatedResult<Tournament>>;
  create(tournament: Tournament): Promise<void>;
  save(tournament: Tournament): Promise<void>;
}

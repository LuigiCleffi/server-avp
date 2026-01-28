import type { GameGenre } from '@/generated/prisma/client';

export type GameRecord = {
  id: string;
  name: string;
  createdById: string | null;
};

export interface GamesRepository {
  findById(id: string): Promise<GameRecord | null>;

  create(input: {
    id: string;
    name: string;
    description: string | null;
    genre: GameGenre;
    active: boolean;
    createdById: string;
  }): Promise<void>;
}

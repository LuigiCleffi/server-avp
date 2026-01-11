export type GameRecord = {
  id: string;
  name: string;
};

export interface GamesRepository {
  findById(id: string): Promise<GameRecord | null>;
}

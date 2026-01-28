export type TournamentManagerGame = 'League of Legends';

export type TournamentManagerCreateTournamentInput = {
  name: string;
  prize: number;
  maxPlayers?: number;
  game?: TournamentManagerGame;
};

export type TournamentManagerCreateTournamentOutput = {
  id: string;
};

export interface TournamentManagerProvider {
  createTournament(
    input: TournamentManagerCreateTournamentInput,
  ): Promise<TournamentManagerCreateTournamentOutput>;
}

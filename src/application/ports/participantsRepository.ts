export interface ParticipantsRepository {
  createOnce(input: { userId: string; tournamentId: string }): Promise<{ created: boolean }>;
  countByTournamentId(tournamentId: string): Promise<number>;
}

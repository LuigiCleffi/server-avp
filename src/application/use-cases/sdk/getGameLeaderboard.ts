import { z } from 'zod';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { SdkEventsRepository } from '@/application/ports/sdkEventsRepository';
import { NotFoundError } from '@/shared/errors/appErrors';

const scoreUpdatedPayloadSchema = z.object({
  playerId: z.string().min(1),
  score: z.number(),
});

export type GetGameLeaderboardInput = {
  gameId: string;
  limit?: number;
};

export type LeaderboardEntry = {
  playerId: string;
  score: number;
  lastOccurredAt: string;
};

export type GetGameLeaderboardOutput = {
  gameId: string;
  items: LeaderboardEntry[];
};

export class GetGameLeaderboard {
  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly sdkEventsRepository: SdkEventsRepository,
  ) {}

  public async execute(input: GetGameLeaderboardInput): Promise<GetGameLeaderboardOutput> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) throw new NotFoundError('Game not found');

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

    // MVP: compute leaderboard from recent SCORE_UPDATED events.
    // We intentionally cap the scan window to keep the query and CPU bounded.
    const scanTake = Math.max(500, limit * 50);

    const events = await this.sdkEventsRepository.listRecentByGameId({
      gameId: input.gameId,
      type: 'SCORE_UPDATED',
      take: scanTake,
    });

    const bestByPlayer = new Map<string, { score: number; lastOccurredAt: Date }>();

    for (const event of events) {
      const parsed = scoreUpdatedPayloadSchema.safeParse(event.payload);
      if (!parsed.success) continue;

      const { playerId, score } = parsed.data;
      const existing = bestByPlayer.get(playerId);

      if (!existing) {
        bestByPlayer.set(playerId, { score, lastOccurredAt: event.occurredAt });
        continue;
      }

      if (score > existing.score) {
        bestByPlayer.set(playerId, { score, lastOccurredAt: event.occurredAt });
        continue;
      }

      if (score === existing.score && event.occurredAt > existing.lastOccurredAt) {
        bestByPlayer.set(playerId, { score, lastOccurredAt: event.occurredAt });
      }
    }

    const items = Array.from(bestByPlayer.entries())
      .map(([playerId, v]) => ({
        playerId,
        score: v.score,
        lastOccurredAt: v.lastOccurredAt.toISOString(),
      }))
      // Deterministic ranking
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.lastOccurredAt !== a.lastOccurredAt) return b.lastOccurredAt.localeCompare(a.lastOccurredAt);
        return a.playerId.localeCompare(b.playerId);
      })
      .slice(0, limit);

    return { gameId: input.gameId, items };
  }
}

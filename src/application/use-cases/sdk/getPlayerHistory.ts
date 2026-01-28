import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { SdkEventsRepository } from '@/application/ports/sdkEventsRepository';
import { NotFoundError } from '@/shared/errors/appErrors';

export type GetPlayerHistoryInput = {
  gameId: string;
  playerId: string;
  limit?: number;
  type?: string;
};

export type PlayerHistoryItem = {
  eventId: string;
  type: string;
  payload: unknown;
  occurredAt: string;
  receivedAt: string;
};

export type GetPlayerHistoryOutput = {
  gameId: string;
  playerId: string;
  items: PlayerHistoryItem[];
};

export class GetPlayerHistory {
  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly sdkEventsRepository: SdkEventsRepository,
  ) {}

  public async execute(input: GetPlayerHistoryInput): Promise<GetPlayerHistoryOutput> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) throw new NotFoundError('Game not found');

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

    // MVP: query-based computation over a bounded window.
    const scanTake = Math.max(500, limit * 50);

    const events = await this.sdkEventsRepository.listRecentByGameId({
      gameId: input.gameId,
      playerId: input.playerId,
      type: input.type,
      take: scanTake,
    });

    const items: PlayerHistoryItem[] = [];

    for (const event of events) {
      items.push({
        eventId: event.eventId,
        type: event.type,
        payload: event.payload,
        occurredAt: event.occurredAt.toISOString(),
        receivedAt: event.receivedAt.toISOString(),
      });

      if (items.length >= limit) break;
    }

    return {
      gameId: input.gameId,
      playerId: input.playerId,
      items,
    };
  }
}

import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import { ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';

export type RevokeGameApiKeyInput = {
  actor: { userId: string; role: string };
  gameId: string;
  apiKeyId: string;
};

function assertCanManageGame(actor: { userId: string; role: string }, game: { createdById: string | null }): void {
  if (!actor?.userId) throw new ForbiddenError('Forbidden');
  if (actor.role === 'ADMIN') return;
  if (actor.role !== 'GAME_CREATOR') throw new ForbiddenError('Forbidden');
  if (!game.createdById || game.createdById !== actor.userId) throw new ForbiddenError('Forbidden');
}

export class RevokeGameApiKey {
  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly gameApiKeysRepository: GameApiKeysRepository,
  ) {}

  public async execute(input: RevokeGameApiKeyInput): Promise<void> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) throw new NotFoundError('Game not found');

    assertCanManageGame(input.actor, game);

    const apiKey = await this.gameApiKeysRepository.findById(input.apiKeyId);
    if (!apiKey || apiKey.gameId !== input.gameId) {
      throw new NotFoundError('Game API key not found');
    }

    await this.gameApiKeysRepository.revokeById(apiKey.id);
  }
}

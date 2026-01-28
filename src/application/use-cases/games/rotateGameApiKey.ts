import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import { ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import { CreateGameApiKey } from './createGameApiKey';

export type RotateGameApiKeyInput = {
  actor: { userId: string; role: string };
  gameId: string;
};

export type RotateGameApiKeyOutput = {
  revokedCount: number;
  apiKey: {
    id: string;
    clientId: string;
    secret: string;
  };
};

function assertCanManageGame(actor: { userId: string; role: string }, game: { createdById: string | null }): void {
  if (!actor?.userId) throw new ForbiddenError('Forbidden');
  if (actor.role === 'ADMIN') return;
  if (actor.role !== 'GAME_CREATOR') throw new ForbiddenError('Forbidden');
  if (!game.createdById || game.createdById !== actor.userId) throw new ForbiddenError('Forbidden');
}

export class RotateGameApiKey {
  private readonly createKey: CreateGameApiKey;

  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly gameApiKeysRepository: GameApiKeysRepository,
    secretHasher: PasswordHasher,
  ) {
    this.createKey = new CreateGameApiKey(gamesRepository, gameApiKeysRepository, secretHasher);
  }

  public async execute(input: RotateGameApiKeyInput): Promise<RotateGameApiKeyOutput> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) throw new NotFoundError('Game not found');

    assertCanManageGame(input.actor, game);

    const { revokedCount } = await this.gameApiKeysRepository.revokeAllActiveForGame(input.gameId);
    const apiKey = await this.createKey.execute({ actor: input.actor, gameId: input.gameId });

    return {
      revokedCount,
      apiKey,
    };
  }
}

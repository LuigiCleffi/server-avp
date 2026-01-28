import { randomBytes } from 'node:crypto';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import { ConflictError, ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';

export type CreateGameApiKeyInput = {
  actor: { userId: string; role: string };
  gameId: string;
};

export type CreateGameApiKeyOutput = {
  id: string;
  clientId: string;
  secret: string;
};

function generateClientId(): string {
  return `gk_${randomBytes(12).toString('hex')}`;
}

function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

function assertCanManageGame(actor: { userId: string; role: string }, game: { createdById: string | null }): void {
  if (!actor?.userId) throw new ForbiddenError('Forbidden');
  if (actor.role === 'ADMIN') return;
  if (actor.role !== 'GAME_CREATOR') throw new ForbiddenError('Forbidden');
  if (!game.createdById || game.createdById !== actor.userId) throw new ForbiddenError('Forbidden');
}

export class CreateGameApiKey {
  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly gameApiKeysRepository: GameApiKeysRepository,
    private readonly secretHasher: PasswordHasher,
  ) {}

  public async execute(input: CreateGameApiKeyInput): Promise<CreateGameApiKeyOutput> {
    const game = await this.gamesRepository.findById(input.gameId);
    if (!game) throw new NotFoundError('Game not found');

    assertCanManageGame(input.actor, game);

    const secret = generateSecret();
    const secretHash = await this.secretHasher.hash(secret);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clientId = generateClientId();

      try {
        const apiKey = await this.gameApiKeysRepository.create({
          gameId: input.gameId,
          clientId,
          secretHash,
        });

        return {
          id: apiKey.id,
          clientId: apiKey.clientId,
          secret,
        };
      } catch (err) {
        if (err instanceof ConflictError) continue;
        throw err;
      }
    }

    throw new Error('Failed to generate a unique clientId');
  }
}

import { randomBytes, randomUUID } from 'node:crypto';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import { ConflictError, ForbiddenError } from '@/shared/errors/appErrors';
import type { GameGenre } from '@/generated/prisma/client';

export type CreateGameInput = {
  actor: { userId: string; role: string };
  name: string;
  description?: string | null;
  genre: GameGenre;
  active?: boolean;
};

export type CreateGameOutput = {
  id: string;
  apiKey: {
    id: string;
    clientId: string;
    secret: string;
  };
};

function canCreateGame(role: string): boolean {
  return role === 'GAME_CREATOR' || role === 'ADMIN';
}

function generateClientId(): string {
  return `gk_${randomBytes(12).toString('hex')}`;
}

function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

export class CreateGame {
  constructor(
    private readonly gamesRepository: GamesRepository,
    private readonly gameApiKeysRepository: GameApiKeysRepository,
    private readonly secretHasher: PasswordHasher,
  ) {}

  public async execute(input: CreateGameInput): Promise<CreateGameOutput> {
    if (!input.actor?.userId || !canCreateGame(input.actor.role)) {
      throw new ForbiddenError('Forbidden');
    }

    const gameId = randomUUID();

    await this.gamesRepository.create({
      id: gameId,
      name: input.name,
      description: input.description ?? null,
      genre: input.genre,
      active: input.active ?? true,
      createdById: input.actor.userId,
    });

    // Create an initial SDK key (secret is only returned once).
    const secret = generateSecret();
    const secretHash = await this.secretHasher.hash(secret);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clientId = generateClientId();

      try {
        const apiKey = await this.gameApiKeysRepository.create({
          gameId,
          clientId,
          secretHash,
        });

        return {
          id: gameId,
          apiKey: {
            id: apiKey.id,
            clientId: apiKey.clientId,
            secret,
          },
        };
      } catch (err) {
        // Retry only on clientId collisions (rare). Any other error should propagate.
        if (err instanceof ConflictError) continue;
        throw err;
      }
    }

    throw new Error('Failed to generate a unique clientId');
  }
}

import type {
  GameApiKeysRepository,
  GameApiKeyRecord,
} from '@/application/ports/gameApiKeysRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { ConflictError } from '@/shared/errors/appErrors';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaGameApiKeysRepository implements GameApiKeysRepository {
  public async findById(id: string): Promise<GameApiKeyRecord | null> {
    const row = await prisma.gameApiKey.findUnique({
      where: { id },
      select: {
        id: true,
        gameId: true,
        clientId: true,
        status: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      gameId: row.gameId,
      clientId: row.clientId,
      status: row.status,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
    };
  }

  public async findActiveByClientId(
    clientId: string,
  ): Promise<(GameApiKeyRecord & { secretHash: string }) | null> {
    const row = await prisma.gameApiKey.findFirst({
      where: { clientId, status: 'ACTIVE' },
      select: {
        id: true,
        gameId: true,
        clientId: true,
        status: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true,
        secretHash: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      gameId: row.gameId,
      clientId: row.clientId,
      status: row.status,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
      secretHash: row.secretHash,
    };
  }

  public async touchLastUsedAt(id: string): Promise<void> {
    await prisma.gameApiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
      select: { id: true },
    });
  }

  public async create(input: {
    gameId: string;
    clientId: string;
    secretHash: string;
  }): Promise<{ id: string; clientId: string }> {
    try {
      const created = await prisma.gameApiKey.create({
        data: {
          gameId: input.gameId,
          clientId: input.clientId,
          secretHash: input.secretHash,
          status: 'ACTIVE',
        },
        select: { id: true, clientId: true },
      });

      return { id: created.id, clientId: created.clientId };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      throw new ConflictError('Client ID already exists');
    }
  }

  public async revokeById(id: string): Promise<void> {
    await prisma.gameApiKey.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  public async revokeAllActiveForGame(gameId: string): Promise<{ revokedCount: number }> {
    const result = await prisma.gameApiKey.updateMany({
      where: { gameId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    return { revokedCount: result.count };
  }
}

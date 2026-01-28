import type { GamesRepository, GameRecord } from '@/application/ports/gamesRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { ConflictError } from '@/shared/errors/appErrors';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaGamesRepository implements GamesRepository {
  async findById(id: string): Promise<GameRecord | null> {
    const record = await prisma.game.findUnique({
      where: { id },
      select: { id: true, name: true, createdById: true },
    });
    if (!record) return null;
    return record;
  }

  async create(input: {
    id: string;
    name: string;
    description: string | null;
    genre: import('@/generated/prisma/client').GameGenre;
    active: boolean;
    createdById: string;
  }): Promise<void> {
    try {
      await prisma.game.create({
        data: {
          id: input.id,
          name: input.name,
          description: input.description,
          genre: input.genre,
          active: input.active,
          createdById: input.createdById,
        },
        select: { id: true },
      });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      throw new ConflictError('Game name already exists');
    }
  }
}

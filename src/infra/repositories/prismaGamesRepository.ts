import type { GamesRepository, GameRecord } from '@/application/ports/gamesRepository';
import { prisma } from '@/infra/prisma/client';

export class PrismaGamesRepository implements GamesRepository {
  async findById(id: string): Promise<GameRecord | null> {
    const record = await prisma.game.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!record) return null;
    return record;
  }
}

import type { ParticipantsRepository } from '@/application/ports/participantsRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaParticipantsRepository implements ParticipantsRepository {
  public async createOnce(input: {
    userId: string;
    tournamentId: string;
  }): Promise<{ created: boolean }> {
    try {
      await prisma.participant.create({
        data: {
          userId: input.userId,
          tournamentId: input.tournamentId,
        },
        select: { id: true },
      });

      return { created: true };
    } catch (err) {
      if (isUniqueConstraintError(err)) return { created: false };
      throw err;
    }
  }

  public async countByTournamentId(tournamentId: string): Promise<number> {
    return prisma.participant.count({ where: { tournamentId } });
  }
}

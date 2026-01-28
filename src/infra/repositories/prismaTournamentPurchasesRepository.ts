import type {
  TournamentPurchasesRepository,
  TournamentPurchaseDto,
} from '@/application/ports/tournamentPurchasesRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaTournamentPurchasesRepository implements TournamentPurchasesRepository {
  public async findByUserAndTournament(input: {
    userId: string;
    tournamentId: string;
  }): Promise<TournamentPurchaseDto | null> {
    const row = await prisma.tournamentPurchase.findUnique({
      where: {
        userId_tournamentId: {
          userId: input.userId,
          tournamentId: input.tournamentId,
        },
      },
      select: {
        id: true,
        userId: true,
        tournamentId: true,
        status: true,
        provider: true,
        externalId: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      tournamentId: row.tournamentId,
      status: row.status,
      provider: row.provider,
      externalId: row.externalId,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
    };
  }

  public async createPendingOnce(input: {
    userId: string;
    tournamentId: string;
  }): Promise<{ purchaseId: string; status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' }> {
    try {
      const created = await prisma.tournamentPurchase.create({
        data: {
          userId: input.userId,
          tournamentId: input.tournamentId,
          status: 'PENDING',
        },
        select: { id: true, status: true },
      });

      return { purchaseId: created.id, status: created.status };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;

      const existing = await prisma.tournamentPurchase.findUnique({
        where: {
          userId_tournamentId: {
            userId: input.userId,
            tournamentId: input.tournamentId,
          },
        },
        select: { id: true, status: true },
      });

      // Should exist due to unique constraint hit.
      if (!existing) throw err;

      return { purchaseId: existing.id, status: existing.status };
    }
  }

  public async setStripeExternalId(input: { purchaseId: string; externalId: string }): Promise<void> {
    await prisma.tournamentPurchase.update({
      where: { id: input.purchaseId },
      data: { provider: 'STRIPE', externalId: input.externalId },
      select: { id: true },
    });
  }

  public async markPaid(input: { purchaseId: string; provider: 'STRIPE' | 'CRYPTO' | null }): Promise<void> {
    await prisma.tournamentPurchase.update({
      where: { id: input.purchaseId },
      data: {
        status: 'PAID',
        provider: input.provider,
        paidAt: new Date(),
      },
      select: { id: true },
    });
  }
}

import type { WalletRepository } from '@/application/ports/walletRepository';
import type { LedgerEntryDto } from '@/application/ports/walletRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/shared/errors/appErrors';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaWalletRepository implements WalletRepository {
  public async ensureWalletForUser(userId: string): Promise<{ walletId: string; currency: string }> {
    const existing = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, currency: true },
    });

    if (existing) return { walletId: existing.id, currency: existing.currency };

    const created = await prisma.wallet.create({
      data: {
        userId,
      },
      select: { id: true, currency: true },
    });

    return { walletId: created.id, currency: created.currency };
  }

  public async getWalletBalanceByUserId(userId: string): Promise<{
    walletId: string;
    userId: string;
    currency: string;
    balance: string;
  }> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, userId: true, currency: true },
    });

    const ensured = wallet ?? (await prisma.wallet.create({
      data: { userId },
      select: { id: true, userId: true, currency: true },
    }));

    const [creditsAgg, debitsAgg] = await Promise.all([
      prisma.ledgerEntry.aggregate({
        where: { walletId: ensured.id, type: 'CREDIT' },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: { walletId: ensured.id, type: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);

    const credits = creditsAgg._sum.amount ?? new Prisma.Decimal(0);
    const debits = debitsAgg._sum.amount ?? new Prisma.Decimal(0);
    const balance = credits.minus(debits);

    return {
      walletId: ensured.id,
      userId: ensured.userId,
      currency: ensured.currency,
      balance: balance.toFixed(2),
    };
  }

  public async listLedgerEntriesByUserId(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: LedgerEntryDto[]; page: number; pageSize: number; total: number }> {
    const { walletId } = await this.ensureWalletForUser(input.userId);

    const skip = (input.page - 1) * input.pageSize;

    const [total, rows] = await Promise.all([
      prisma.ledgerEntry.count({ where: { walletId } }),
      prisma.ledgerEntry.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.pageSize,
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      page: input.page,
      pageSize: input.pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        currency: r.currency,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    };
  }

  public async createTopUpPayment(input: {
    userId: string;
    provider: 'STRIPE' | 'CRYPTO';
    amount: string;
    currency: string;
  }): Promise<{ paymentId: string }> {
    const { walletId } = await this.ensureWalletForUser(input.userId);

    const payment = await prisma.payment.create({
      data: {
        walletId,
        provider: input.provider,
        status: 'PENDING',
        amount: input.amount,
        currency: input.currency,
      },
      select: { id: true },
    });

    return { paymentId: payment.id };
  }

  public async setPaymentExternalId(input: { paymentId: string; externalId: string }): Promise<void> {
    await prisma.payment.update({
      where: { id: input.paymentId },
      data: { externalId: input.externalId },
      select: { id: true },
    });
  }

  public async markPaymentStatus(input: {
    paymentId: string;
    status: 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  }): Promise<void> {
    await prisma.payment.update({
      where: { id: input.paymentId },
      data: { status: input.status },
      select: { id: true },
    });
  }

  public async createWebhookEventOnce(input: {
    provider: 'STRIPE' | 'CRYPTO';
    externalId: string;
    payload: unknown;
  }): Promise<{ created: boolean }> {
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: input.provider,
          externalId: input.externalId,
          payload: input.payload as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      return { created: true };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return { created: false };
      }
      throw err;
    }
  }

  public async creditWalletForPaymentOnce(input: {
    paymentId: string;
    reason: string;
  }): Promise<{ created: boolean }> {
    const payment = await prisma.payment.findUnique({
      where: { id: input.paymentId },
      select: {
        id: true,
        walletId: true,
        amount: true,
        currency: true,
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found', { paymentId: input.paymentId });
    }

    try {
      await prisma.ledgerEntry.create({
        data: {
          walletId: payment.walletId,
          type: 'CREDIT',
          amount: payment.amount,
          currency: payment.currency,
          reason: input.reason,
          paymentId: payment.id,
        },
        select: { id: true },
      });
      return { created: true };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return { created: false };
      }
      throw err;
    }
  }

  public async debitWalletForTournamentPurchaseOnce(input: {
    userId: string;
    tournamentPurchaseId: string;
    amount: string;
    currency: string;
    reason: string;
  }): Promise<{ created: boolean }> {
    const { walletId } = await this.ensureWalletForUser(input.userId);

    try {
      await prisma.ledgerEntry.create({
        data: {
          walletId,
          type: 'DEBIT',
          amount: input.amount,
          currency: input.currency,
          reason: input.reason,
          tournamentPurchaseId: input.tournamentPurchaseId,
        },
        select: { id: true },
      });
      return { created: true };
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        return { created: false };
      }
      throw err;
    }
  }
}

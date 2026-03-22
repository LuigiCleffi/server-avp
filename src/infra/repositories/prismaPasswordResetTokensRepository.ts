import type {
  PasswordResetTokenRecord,
  PasswordResetTokensRepository,
} from '@/application/ports/passwordResetTokensRepository';
import { prisma } from '@/infra/prisma/client';

export class PrismaPasswordResetTokensRepository implements PasswordResetTokensRepository {
  async create(input: { accountId: string; tokenHash: string; expiresAt: Date }): Promise<{ id: string }> {
    const record = await prisma.passwordResetToken.create({
      data: {
        accountId: input.accountId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
      select: { id: true },
    });

    return { id: record.id };
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record) return null;

    return {
      id: record.id,
      accountId: record.accountId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt },
    });
  }
}

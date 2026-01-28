import type {
  CreatorRequestsRepository,
  CreatorRequestDto,
} from '@/application/ports/creatorRequestsRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaCreatorRequestsRepository implements CreatorRequestsRepository {
  public async createOnce(input: { requestedById: string }): Promise<{ requestId: string; created: boolean }> {
    try {
      const created = await prisma.creatorRequest.create({
        data: { requestedById: input.requestedById, status: 'PENDING' },
        select: { id: true },
      });
      return { requestId: created.id, created: true };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      const existing = await prisma.creatorRequest.findFirst({
        where: { requestedById: input.requestedById },
        select: { id: true },
      });
      if (!existing) throw err;
      return { requestId: existing.id, created: false };
    }
  }

  public async findById(id: string): Promise<CreatorRequestDto | null> {
    const row = await prisma.creatorRequest.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      requestedById: row.requestedById,
      status: row.status,
      adminNotes: row.adminNotes,
      reviewedAt: row.reviewedAt,
      reviewedById: row.reviewedById,
      createdAt: row.createdAt,
    };
  }

  public async review(input: {
    id: string;
    status: 'APPROVED' | 'REJECTED';
    reviewedById: string;
    adminNotes?: string | null;
  }): Promise<void> {
    await prisma.creatorRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewedAt: new Date(),
        reviewedById: input.reviewedById,
        adminNotes: input.adminNotes ?? null,
      },
      select: { id: true },
    });
  }
}

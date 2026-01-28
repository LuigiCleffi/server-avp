import type {
  TournamentRequestsRepository,
  TournamentRequestDto,
} from '@/application/ports/tournamentRequestsRepository';
import { prisma } from '@/infra/prisma/client';

export class PrismaTournamentRequestsRepository implements TournamentRequestsRepository {
  public async create(input: {
    title: string;
    description: string;
    startDate: Date;
    endDate: Date | null;
    prizePool: number;
    fee: number;
    maxPlayers: number;
    gameId: string;
    requestedById: string;
    justification: string;
  }): Promise<{ id: number }> {
    const created = await prisma.tournamentRequest.create({
      data: {
        title: input.title,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        prizePool: input.prizePool,
        fee: input.fee,
        maxPlayers: input.maxPlayers,
        gameId: input.gameId,
        requestedById: input.requestedById,
        justification: input.justification,
        status: 'PENDING_APPROVAL',
      },
      select: { id: true },
    });

    return { id: created.id };
  }

  public async findById(id: number): Promise<TournamentRequestDto | null> {
    const row = await prisma.tournamentRequest.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.startDate,
      endDate: row.endDate,
      prizePool: row.prizePool,
      fee: row.fee,
      maxPlayers: row.maxPlayers,
      gameId: row.gameId,
      requestedById: row.requestedById,
      justification: row.justification,
      adminNotes: row.adminNotes,
      status: row.status as TournamentRequestDto['status'],
      reviewedAt: row.reviewedAt,
      reviewedById: row.reviewedById,
      createdAt: row.createdAt,
    };
  }

  public async review(input: {
    id: number;
    status: 'APPROVED' | 'REJECTED';
    reviewedById: string;
    adminNotes?: string | null;
  }): Promise<void> {
    await prisma.tournamentRequest.update({
      where: { id: input.id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes ?? null,
        reviewedAt: new Date(),
        reviewedById: input.reviewedById,
      },
      select: { id: true },
    });
  }
}

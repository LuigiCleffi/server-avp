import type {
  ListTournamentsFilter,
  PaginatedResult,
  PaginationInput,
  TournamentsRepository,
} from '@/application/ports/tournamentsRepository';
import { Tournament, TournamentFormat, TournamentStatus } from '@/domain/entities/tournament';
import { prisma } from '@/infra/prisma/client';

export class PrismaTournamentsRepository implements TournamentsRepository {
  async findById(id: string): Promise<Tournament | null> {
    const record = await prisma.tournament.findUnique({ where: { id } });
    if (!record) return null;

    return Tournament.restore({
      id: record.id,
      name: record.name,
      description: record.description,
      startDate: record.startDate,
      endDate: record.endDate,
      fee: record.fee.toString(),
      prizePool: record.prizePool.toString(),
      format: record.format as unknown as TournamentFormat,
      maxParticipants: record.maxParticipants,
      status: record.status as unknown as TournamentStatus,
      organizerUserId: record.userId,
      gameId: record.gameId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async list(
    filter: ListTournamentsFilter,
    pagination: PaginationInput,
  ): Promise<PaginatedResult<Tournament>> {
    const pageSize = Math.max(1, Math.min(100, pagination.pageSize));
    const page = Math.max(1, pagination.page);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filter.gameId) where.gameId = filter.gameId;
    if (filter.status) where.status = filter.status;

    if (filter.startFrom || filter.startTo) {
      where.startDate = {};
      if (filter.startFrom) where.startDate.gte = filter.startFrom;
      if (filter.startTo) where.startDate.lte = filter.startTo;
    }

    const [total, rows] = await Promise.all([
      prisma.tournament.count({ where }),
      prisma.tournament.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: rows.map((record) =>
        Tournament.restore({
          id: record.id,
          name: record.name,
          description: record.description,
          startDate: record.startDate,
          endDate: record.endDate,
          fee: record.fee.toString(),
          prizePool: record.prizePool.toString(),
          format: record.format as unknown as TournamentFormat,
          maxParticipants: record.maxParticipants,
          status: record.status as unknown as TournamentStatus,
          organizerUserId: record.userId,
          gameId: record.gameId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }),
      ),
    };
  }

  async create(tournament: Tournament): Promise<void> {
    const p = tournament.toPrimitives();

    await prisma.tournament.create({
      data: {
        id: p.id,
        name: p.name,
        description: p.description,
        startDate: new Date(p.startDate),
        endDate: p.endDate ? new Date(p.endDate) : null,
        fee: p.fee,
        prizePool: p.prizePool,
        format: p.format,
        maxParticipants: p.maxParticipants,
        status: p.status,
        userId: p.organizerUserId,
        gameId: p.gameId,
      },
    });
  }

  async save(tournament: Tournament): Promise<void> {
    const p = tournament.toPrimitives();

    await prisma.tournament.update({
      where: { id: p.id },
      data: {
        name: p.name,
        description: p.description,
        startDate: new Date(p.startDate),
        endDate: p.endDate ? new Date(p.endDate) : null,
        fee: p.fee,
        prizePool: p.prizePool,
        format: p.format,
        maxParticipants: p.maxParticipants,
        status: p.status,
      },
    });
  }
}

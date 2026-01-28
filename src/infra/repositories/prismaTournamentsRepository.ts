import type {
  ListTournamentsFilter,
  PaginatedResult,
  PaginationInput,
  TournamentsRepository,
} from '@/application/ports/tournamentsRepository';
import { Tournament, TournamentFormat, TournamentStatus } from '@/domain/entities/tournament';
import type {
  Prisma,
  TournamentFormat as PrismaTournamentFormat,
  TournamentStatus as PrismaTournamentStatus,
} from '@/generated/prisma/client';
import { prisma } from '@/infra/prisma/client';

function toDomainTournamentFormat(format: PrismaTournamentFormat): TournamentFormat {
  switch (format) {
    case 'SINGLE_ELIMINATION':
      return TournamentFormat.SINGLE_ELIMINATION;
    case 'DOUBLE_ELIMINATION':
      return TournamentFormat.DOUBLE_ELIMINATION;
    case 'ROUND_ROBIN':
      return TournamentFormat.ROUND_ROBIN;
    case 'SWISS':
      return TournamentFormat.SWISS;
  }
}

function toDomainTournamentStatus(status: PrismaTournamentStatus): TournamentStatus {
  switch (status) {
    case 'DRAFT':
      return TournamentStatus.DRAFT;
    case 'SCHEDULED':
      return TournamentStatus.SCHEDULED;
    case 'RUNNING':
      return TournamentStatus.RUNNING;
    case 'COMPLETED':
      return TournamentStatus.COMPLETED;
    case 'CANCELED':
      return TournamentStatus.CANCELED;
    case 'PENDING_APPROVAL':
      return TournamentStatus.PENDING_APPROVAL;
  }
}

function toPrismaTournamentFormat(format: TournamentFormat): PrismaTournamentFormat {
  switch (format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return 'SINGLE_ELIMINATION';
    case TournamentFormat.DOUBLE_ELIMINATION:
      return 'DOUBLE_ELIMINATION';
    case TournamentFormat.ROUND_ROBIN:
      return 'ROUND_ROBIN';
    case TournamentFormat.SWISS:
      return 'SWISS';
  }
}

function toPrismaTournamentStatus(status: TournamentStatus): PrismaTournamentStatus {
  switch (status) {
    case TournamentStatus.DRAFT:
      return 'DRAFT';
    case TournamentStatus.SCHEDULED:
      return 'SCHEDULED';
    case TournamentStatus.RUNNING:
      return 'RUNNING';
    case TournamentStatus.COMPLETED:
      return 'COMPLETED';
    case TournamentStatus.CANCELED:
      return 'CANCELED';
    case TournamentStatus.PENDING_APPROVAL:
      return 'PENDING_APPROVAL';
  }
}

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
      format: toDomainTournamentFormat(record.format),
      maxParticipants: record.maxParticipants,
      status: toDomainTournamentStatus(record.status),
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

    const where: Prisma.TournamentWhereInput = {};

    if (filter.gameId) where.gameId = filter.gameId;
    if (filter.status) where.status = toPrismaTournamentStatus(filter.status);

    if (filter.startFrom || filter.startTo) {
      where.startDate = {
        ...(filter.startFrom ? { gte: filter.startFrom } : {}),
        ...(filter.startTo ? { lte: filter.startTo } : {}),
      };
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
          format: toDomainTournamentFormat(record.format),
          maxParticipants: record.maxParticipants,
          status: toDomainTournamentStatus(record.status),
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
        format: toPrismaTournamentFormat(p.format),
        maxParticipants: p.maxParticipants,
        status: toPrismaTournamentStatus(p.status),
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
        format: toPrismaTournamentFormat(p.format),
        maxParticipants: p.maxParticipants,
        status: toPrismaTournamentStatus(p.status),
      },
    });
  }

  async setTournamentManagerId(input: { tournamentId: string; tournamentManagerId: string }): Promise<void> {
    await prisma.tournament.update({
      where: { id: input.tournamentId },
      data: { tournamentManagerId: input.tournamentManagerId },
      select: { id: true },
    });
  }
}

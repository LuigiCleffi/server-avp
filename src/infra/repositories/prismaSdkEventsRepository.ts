import type {
  SdkEventsRepository,
  SdkEventCreateResult,
  SdkEventRecord,
} from '@/application/ports/sdkEventsRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaSdkEventsRepository implements SdkEventsRepository {
  public async createOnce(input: {
    gameId: string;
    apiKeyId: string;
    eventId: string;
    type: string;
    playerId?: string | null;
    payload: unknown;
    occurredAt: Date;
  }): Promise<SdkEventCreateResult> {
    try {
      await prisma.sdkEvent.create({
        data: {
          gameId: input.gameId,
          apiKeyId: input.apiKeyId,
          eventId: input.eventId,
          type: input.type,
          playerId: input.playerId ?? null,
          payload: input.payload as Prisma.InputJsonValue,
          occurredAt: input.occurredAt,
        },
        select: { id: true },
      });

      return { created: true };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      return { created: false, reason: 'DUPLICATE' };
    }
  }

  public async listRecentByGameId(input: {
    gameId: string;
    playerId?: string;
    type?: string;
    take: number;
  }): Promise<SdkEventRecord[]> {
    const rows = await prisma.sdkEvent.findMany({
      where: {
        gameId: input.gameId,
        ...(input.playerId ? { playerId: input.playerId } : {}),
        ...(input.type ? { type: input.type } : {}),
      },
      orderBy: { receivedAt: 'desc' },
      take: input.take,
      select: {
        id: true,
        eventId: true,
        type: true,
        playerId: true,
        payload: true,
        occurredAt: true,
        receivedAt: true,
      },
    });

    return rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      type: r.type,
      playerId: r.playerId,
      payload: r.payload,
      occurredAt: r.occurredAt,
      receivedAt: r.receivedAt,
    }));
  }
}

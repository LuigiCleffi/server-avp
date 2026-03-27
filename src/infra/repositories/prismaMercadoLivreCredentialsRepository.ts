import type {
  MercadoLivreCredentials,
  MercadoLivreCredentialsRepository,
  SaveMercadoLivreCredentialsInput,
} from '@/application/ports/mercadoLivreCredentialsRepository';
import { prisma } from '@/infra/prisma/client';

function toDomain(record: {
  sellerId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  updatedAt: Date;
  createdAt: Date;
}): MercadoLivreCredentials {
  return {
    sellerId: record.sellerId,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    expiresAt: record.expiresAt,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export class PrismaMercadoLivreCredentialsRepository implements MercadoLivreCredentialsRepository {
  async findBySellerId(sellerId: string): Promise<MercadoLivreCredentials | null> {
    const record = await prisma.mercadoLivreCredential.findUnique({
      where: { sellerId },
    });

    return record ? toDomain(record) : null;
  }

  async save(input: SaveMercadoLivreCredentialsInput): Promise<MercadoLivreCredentials> {
    const record = await prisma.mercadoLivreCredential.upsert({
      where: { sellerId: input.sellerId },
      update: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      },
      create: {
        sellerId: input.sellerId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      },
    });

    return toDomain(record);
  }
}

import { Prisma } from '@/generated/prisma/client';
import type {
  ListMercadoLivreOrdersInput,
  MercadoLivreOrderRecord,
  MercadoLivreOrdersRepository,
  SaveMercadoLivreOrderInput,
} from '@/application/ports/mercadoLivreOrdersRepository';
import { prisma } from '@/infra/prisma/client';

type MercadoLivreOrderRow = {
  orderId: bigint;
  sellerId: string;
  status: string;
  totalAmount: Prisma.Decimal;
  items: Prisma.JsonValue;
  shippingId: bigint | null;
  packId: bigint | null;
  nfeStatus: string;
  rawPayload: Prisma.JsonValue | null;
  updatedAt: Date;
  createdAt: Date;
};

function toDomain(record: MercadoLivreOrderRow): MercadoLivreOrderRecord {
  return {
    orderId: record.orderId.toString(),
    sellerId: record.sellerId,
    status: record.status,
    totalAmount: record.totalAmount.toString(),
    items: record.items,
    shippingId: record.shippingId?.toString() ?? null,
    packId: record.packId?.toString() ?? null,
    nfeStatus: record.nfeStatus,
    rawPayload: record.rawPayload,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

function toNullableBigInt(value?: string | null): bigint | null {
  if (!value) return null;
  return BigInt(value);
}

export class PrismaMercadoLivreOrdersRepository implements MercadoLivreOrdersRepository {
  async findByOrderId(orderId: string): Promise<MercadoLivreOrderRecord | null> {
    const record = await prisma.mercadoLivreOrder.findUnique({
      where: { orderId: BigInt(orderId) },
    });

    return record ? toDomain(record) : null;
  }

  async listBySellerId(input: ListMercadoLivreOrdersInput): Promise<MercadoLivreOrderRecord[]> {
    const records = await prisma.mercadoLivreOrder.findMany({
      where: { sellerId: input.sellerId },
      orderBy: { updatedAt: 'desc' },
      take: input.limit ?? 20,
      skip: input.offset ?? 0,
    });

    return records.map(toDomain);
  }

  async save(input: SaveMercadoLivreOrderInput): Promise<MercadoLivreOrderRecord> {
    const record = await prisma.mercadoLivreOrder.upsert({
      where: { orderId: BigInt(input.orderId) },
      update: {
        sellerId: input.sellerId,
        status: input.status,
        totalAmount: new Prisma.Decimal(input.totalAmount),
        items: input.items as Prisma.InputJsonValue,
        shippingId: toNullableBigInt(input.shippingId),
        packId: toNullableBigInt(input.packId),
        nfeStatus: input.nfeStatus,
        rawPayload: (input.rawPayload ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      },
      create: {
        orderId: BigInt(input.orderId),
        sellerId: input.sellerId,
        status: input.status,
        totalAmount: new Prisma.Decimal(input.totalAmount),
        items: input.items as Prisma.InputJsonValue,
        shippingId: toNullableBigInt(input.shippingId),
        packId: toNullableBigInt(input.packId),
        nfeStatus: input.nfeStatus,
        rawPayload: (input.rawPayload ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      },
    });

    return toDomain(record);
  }
}

import type { SdkNoncesRepository, NonceCreateResult } from '@/application/ports/sdkNoncesRepository';
import { prisma } from '@/infra/prisma/client';
import { Prisma } from '@/generated/prisma/client';

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export class PrismaSdkNoncesRepository implements SdkNoncesRepository {
  public async createOnce(input: { apiKeyId: string; nonce: string }): Promise<NonceCreateResult> {
    try {
      await prisma.sdkRequestNonce.create({
        data: {
          apiKeyId: input.apiKeyId,
          nonce: input.nonce,
        },
        select: { id: true },
      });

      return { created: true };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      return { created: false, reason: 'DUPLICATE' };
    }
  }
}

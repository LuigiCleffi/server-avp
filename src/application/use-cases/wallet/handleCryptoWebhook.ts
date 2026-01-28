import type { CryptoPaymentProvider } from '@/application/ports/cryptoPaymentProvider';
import type { WalletRepository } from '@/application/ports/walletRepository';
import { AppError } from '@/shared/errors/appErrors';

export type HandleCryptoWebhookInput = {
  rawBody: string;
  signature: string;
};

export type HandleCryptoWebhookOutput = {
  received: true;
};

function getMetadataValue(input: unknown, key: string): string | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const metadata = (input as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== 'object') return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export class HandleCryptoWebhook {
  constructor(
    private readonly cryptoProvider: CryptoPaymentProvider,
    private readonly walletRepository: WalletRepository,
  ) {}

  public async execute(input: HandleCryptoWebhookInput): Promise<HandleCryptoWebhookOutput> {
    const event = await this.cryptoProvider.verifyWebhook({
      rawBody: input.rawBody,
      signature: input.signature,
    });

    const once = await this.walletRepository.createWebhookEventOnce({
      provider: 'CRYPTO',
      externalId: event.id,
      payload: event,
    });

    // Webhooks can retry; if we already processed this event id, we're done.
    if (!once.created) {
      return { received: true };
    }

    const paymentId = getMetadataValue(event.data.object, 'paymentId');

    const normalizedType = event.type.trim().toLowerCase();

    if (normalizedType === 'payment_succeeded' || normalizedType === 'payment.succeeded') {
      if (!paymentId) {
        throw new AppError({
          code: 'CRYPTO_WEBHOOK_INVALID',
          message: 'Crypto webhook missing payment metadata',
          statusCode: 400,
          details: { cryptoEventId: event.id },
        });
      }

      await this.walletRepository.markPaymentStatus({ paymentId, status: 'SUCCEEDED' });
      await this.walletRepository.creditWalletForPaymentOnce({
        paymentId,
        reason: 'CRYPTO_TOPUP',
      });

      return { received: true };
    }

    if (normalizedType === 'payment_failed' || normalizedType === 'payment.failed') {
      if (!paymentId) {
        return { received: true };
      }

      await this.walletRepository.markPaymentStatus({ paymentId, status: 'FAILED' });
      return { received: true };
    }

    return { received: true };
  }
}

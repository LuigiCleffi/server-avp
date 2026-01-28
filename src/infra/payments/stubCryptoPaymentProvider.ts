import type {
  CryptoCreateInvoiceInput,
  CryptoCreateInvoiceOutput,
  CryptoPaymentProvider,
  CryptoWebhookEvent,
  CryptoWebhookVerifyInput,
} from '@/application/ports/cryptoPaymentProvider';
import { AppError } from '@/shared/errors/appErrors';

export class StubCryptoPaymentProvider implements CryptoPaymentProvider {
  public async createTopUpInvoice(_input: CryptoCreateInvoiceInput): Promise<CryptoCreateInvoiceOutput> {
    throw new AppError({
      code: 'CRYPTO_PROVIDER_NOT_CONFIGURED',
      message: 'Crypto provider integration is not enabled yet',
      statusCode: 503,
    });
  }

  public async verifyWebhook(_input: CryptoWebhookVerifyInput): Promise<CryptoWebhookEvent> {
    throw new AppError({
      code: 'CRYPTO_PROVIDER_NOT_CONFIGURED',
      message: 'Crypto provider integration is not enabled yet',
      statusCode: 503,
    });
  }
}

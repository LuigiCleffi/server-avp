import type { WalletRepository } from '@/application/ports/walletRepository';
import type { CryptoPaymentProvider } from '@/application/ports/cryptoPaymentProvider';
import { amountToMinorUnits } from './money';

export type CreateCryptoTopUpInvoiceInput = {
  userId: string;
  amount: string;
  currency: string;
};

export type CreateCryptoTopUpInvoiceOutput = {
  paymentId: string;
  checkoutUrl?: string;
  address?: string;
};

export class CreateCryptoTopUpInvoice {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly cryptoProvider: CryptoPaymentProvider,
  ) {}

  public async execute(input: CreateCryptoTopUpInvoiceInput): Promise<CreateCryptoTopUpInvoiceOutput> {
    const currency = input.currency.trim().toLowerCase();
    const amountMinor = amountToMinorUnits(input.amount, 2);

    const { paymentId } = await this.walletRepository.createTopUpPayment({
      userId: input.userId,
      provider: 'CRYPTO',
      amount: input.amount,
      currency,
    });

    const invoice = await this.cryptoProvider.createTopUpInvoice({
      amountMinor,
      currency,
      metadata: {
        paymentId,
        userId: input.userId,
      },
    });

    await this.walletRepository.setPaymentExternalId({
      paymentId,
      externalId: invoice.externalId,
    });

    return {
      paymentId,
      checkoutUrl: invoice.checkoutUrl,
      address: invoice.address,
    };
  }
}

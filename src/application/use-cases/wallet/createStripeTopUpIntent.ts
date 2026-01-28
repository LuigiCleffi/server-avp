import type { WalletRepository } from '@/application/ports/walletRepository';
import type { StripeProvider } from '@/application/ports/stripeProvider';
import { amountToMinorUnits } from './money';

export type CreateStripeTopUpIntentInput = {
  userId: string;
  amount: string;
  currency: string;
};

export type CreateStripeTopUpIntentOutput = {
  paymentId: string;
  clientSecret: string;
};

export class CreateStripeTopUpIntent {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly stripeProvider: StripeProvider,
  ) {}

  public async execute(input: CreateStripeTopUpIntentInput): Promise<CreateStripeTopUpIntentOutput> {
    const currency = input.currency.trim().toLowerCase();
    const amountMinor = amountToMinorUnits(input.amount, 2);

    const { paymentId } = await this.walletRepository.createTopUpPayment({
      userId: input.userId,
      provider: 'STRIPE',
      amount: input.amount,
      currency,
    });

    const intent = await this.stripeProvider.createTopUpPaymentIntent({
      amountMinor,
      currency,
      metadata: {
        paymentId,
        userId: input.userId,
      },
    });

    await this.walletRepository.setPaymentExternalId({
      paymentId,
      externalId: intent.externalId,
    });

    return {
      paymentId,
      clientSecret: intent.clientSecret,
    };
  }
}

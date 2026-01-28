import type { StripeProvider } from '@/application/ports/stripeProvider';
import type { WalletRepository } from '@/application/ports/walletRepository';
import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';
import { AppError } from '@/shared/errors/appErrors';
import { ConfirmTournamentEntryPayment } from '@/application/use-cases/tournaments/confirmTournamentEntryPayment';

export type HandleStripeWebhookInput = {
  rawBody: string;
  signature: string;
};

export type HandleStripeWebhookOutput = {
  received: true;
};

export class HandleStripeWebhook {
  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly walletRepository: WalletRepository,
    private readonly tournamentPurchasesRepository: TournamentPurchasesRepository,
  ) {}

  public async execute(input: HandleStripeWebhookInput): Promise<HandleStripeWebhookOutput> {
    const event = await this.stripeProvider.verifyWebhook({
      rawBody: input.rawBody,
      signature: input.signature,
    });

    const once = await this.walletRepository.createWebhookEventOnce({
      provider: 'STRIPE',
      externalId: event.id,
      payload: event,
    });

    // Webhooks can retry; if we already processed this event id, we're done.
    if (!once.created) {
      return { received: true };
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as { id?: string; metadata?: Record<string, string> };
      const paymentId = paymentIntent?.metadata?.paymentId;
      const purchaseId = paymentIntent?.metadata?.purchaseId;

      if (paymentId) {
        await this.walletRepository.markPaymentStatus({ paymentId, status: 'SUCCEEDED' });
        await this.walletRepository.creditWalletForPaymentOnce({
          paymentId,
          reason: 'STRIPE_TOPUP',
        });

        return { received: true };
      }

      if (purchaseId) {
        const confirm = new ConfirmTournamentEntryPayment(this.tournamentPurchasesRepository);
        await confirm.execute({ purchaseId });
        return { received: true };
      }

      throw new AppError({
        code: 'STRIPE_WEBHOOK_INVALID',
        message: 'Stripe webhook missing payment metadata',
        statusCode: 400,
        details: { stripeEventId: event.id, paymentIntentId: paymentIntent?.id },
      });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as { id?: string; metadata?: Record<string, string> };
      const paymentId = paymentIntent?.metadata?.paymentId;
      const purchaseId = paymentIntent?.metadata?.purchaseId;

      if (paymentId) {
        await this.walletRepository.markPaymentStatus({ paymentId, status: 'FAILED' });
        return { received: true };
      }

      if (purchaseId) {
        // For MVP we don't persist FAILED state for purchases yet.
        return { received: true };
      }

      throw new AppError({
        code: 'STRIPE_WEBHOOK_INVALID',
        message: 'Stripe webhook missing payment metadata',
        statusCode: 400,
        details: { stripeEventId: event.id, paymentIntentId: paymentIntent?.id },
      });
    }

    return { received: true };
  }
}

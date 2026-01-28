import Stripe from 'stripe';
import type {
  StripeCreatePaymentIntentInput,
  StripeCreatePaymentIntentOutput,
  StripeProvider,
  StripeWebhookEvent,
  StripeWebhookVerifyInput,
} from '@/application/ports/stripeProvider';
import { AppError } from '@/shared/errors/appErrors';

export class StripeProviderImpl implements StripeProvider {
  private readonly stripe: Stripe;

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.stripe = new Stripe(secretKey || 'missing', {
      apiVersion: '2025-12-15.clover',
    });
  }

  public async createTopUpPaymentIntent(
    input: StripeCreatePaymentIntentInput,
  ): Promise<StripeCreatePaymentIntentOutput> {
    if (!this.secretKey) {
      throw new AppError({
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: 'Stripe secret key is not configured',
        statusCode: 503,
      });
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: input.amountMinor,
      currency: input.currency,
      metadata: input.metadata,
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      throw new AppError({
        code: 'STRIPE_INTENT_INVALID',
        message: 'Stripe PaymentIntent missing client_secret',
        statusCode: 500,
        details: { paymentIntentId: intent.id },
      });
    }

    return {
      externalId: intent.id,
      clientSecret: intent.client_secret,
    };
  }

  public async verifyWebhook(input: StripeWebhookVerifyInput): Promise<StripeWebhookEvent> {
    if (!this.webhookSecret) {
      throw new AppError({
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: 'Stripe webhook secret is not configured',
        statusCode: 503,
      });
    }

    const event = this.stripe.webhooks.constructEvent(
      input.rawBody,
      input.signature,
      this.webhookSecret,
    );

    return event as unknown as StripeWebhookEvent;
  }
}

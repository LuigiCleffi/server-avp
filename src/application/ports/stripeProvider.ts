export type StripeCreatePaymentIntentInput = {
  amountMinor: number;
  currency: string;
  metadata: Record<string, string>;
};

export type StripeCreatePaymentIntentOutput = {
  externalId: string;
  clientSecret: string;
};

export type StripeWebhookVerifyInput = {
  rawBody: string;
  signature: string;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

export interface StripeProvider {
  createTopUpPaymentIntent(input: StripeCreatePaymentIntentInput): Promise<StripeCreatePaymentIntentOutput>;
  verifyWebhook(input: StripeWebhookVerifyInput): Promise<StripeWebhookEvent>;
}

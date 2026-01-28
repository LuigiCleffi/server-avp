export type CryptoCreateInvoiceInput = {
  amountMinor: number;
  currency: string;
  metadata: Record<string, string>;
};

export type CryptoCreateInvoiceOutput = {
  externalId: string;
  checkoutUrl?: string;
  address?: string;
};

export type CryptoWebhookVerifyInput = {
  rawBody: string;
  signature: string;
};

export type CryptoWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
};

export interface CryptoPaymentProvider {
  createTopUpInvoice(input: CryptoCreateInvoiceInput): Promise<CryptoCreateInvoiceOutput>;
  verifyWebhook(input: CryptoWebhookVerifyInput): Promise<CryptoWebhookEvent>;
}

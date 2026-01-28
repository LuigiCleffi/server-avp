export type WalletBalance = {
  walletId: string;
  userId: string;
  currency: string;
  balance: string;
};

export type LedgerEntryDto = {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  currency: string;
  reason: string;
  createdAt: Date;
};

export type PaymentDto = {
  id: string;
  provider: 'STRIPE' | 'CRYPTO';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  externalId: string | null;
  amount: string;
  currency: string;
  createdAt: Date;
};

export interface WalletRepository {
  ensureWalletForUser(userId: string): Promise<{ walletId: string; currency: string }>;

  getWalletBalanceByUserId(userId: string): Promise<WalletBalance>;

  listLedgerEntriesByUserId(input: {
    userId: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: LedgerEntryDto[]; page: number; pageSize: number; total: number }>;

  createTopUpPayment(input: {
    userId: string;
    amount: string;
    currency: string;
  }): Promise<{ paymentId: string }>;

  setPaymentExternalId(input: { paymentId: string; externalId: string }): Promise<void>;

  markPaymentStatus(input: {
    paymentId: string;
    status: 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  }): Promise<void>;

  createWebhookEventOnce(input: {
    provider: 'STRIPE' | 'CRYPTO';
    externalId: string;
    payload: unknown;
  }): Promise<{ created: boolean }>;

  creditWalletForPaymentOnce(input: {
    paymentId: string;
    reason: string;
  }): Promise<{ created: boolean }>;

  debitWalletForTournamentPurchaseOnce(input: {
    userId: string;
    tournamentPurchaseId: string;
    amount: string;
    currency: string;
    reason: string;
  }): Promise<{ created: boolean }>;
}

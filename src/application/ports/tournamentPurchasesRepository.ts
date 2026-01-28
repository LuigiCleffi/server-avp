export type TournamentPurchaseStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type TournamentPurchasePaymentProvider = 'STRIPE' | 'CRYPTO';

export type TournamentPurchaseDto = {
  id: string;
  userId: string;
  tournamentId: string;
  status: TournamentPurchaseStatus;
  provider: TournamentPurchasePaymentProvider | null;
  externalId: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

export interface TournamentPurchasesRepository {
  findByUserAndTournament(input: {
    userId: string;
    tournamentId: string;
  }): Promise<TournamentPurchaseDto | null>;

  createPendingOnce(input: {
    userId: string;
    tournamentId: string;
  }): Promise<{ purchaseId: string; status: TournamentPurchaseStatus }>;

  setStripeExternalId(input: { purchaseId: string; externalId: string }): Promise<void>;

  markPaid(input: { purchaseId: string; provider: TournamentPurchasePaymentProvider | null }): Promise<void>;
}

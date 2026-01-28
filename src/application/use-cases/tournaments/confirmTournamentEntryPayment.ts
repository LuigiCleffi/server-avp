import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';

export type ConfirmTournamentEntryPaymentInput = {
  purchaseId: string;
};

export type ConfirmTournamentEntryPaymentOutput = {
  confirmed: true;
};

export class ConfirmTournamentEntryPayment {
  constructor(private readonly tournamentPurchasesRepository: TournamentPurchasesRepository) {}

  public async execute(input: ConfirmTournamentEntryPaymentInput): Promise<ConfirmTournamentEntryPaymentOutput> {
    await this.tournamentPurchasesRepository.markPaid({
      purchaseId: input.purchaseId,
      provider: 'STRIPE',
    });

    return { confirmed: true };
  }
}

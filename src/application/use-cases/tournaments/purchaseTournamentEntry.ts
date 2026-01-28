import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import type { WalletRepository } from '@/application/ports/walletRepository';
import type { StripeProvider } from '@/application/ports/stripeProvider';
import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';
import { ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import { moneyToMinorUnits } from '@/application/use-cases/wallet/money';
import { TournamentStatus } from '@/domain/entities/tournament';

export type PurchaseMethod = 'AUTO' | 'WALLET' | 'STRIPE';

export type PurchaseTournamentEntryInput = {
  userId: string;
  tournamentId: string;
  method?: PurchaseMethod;
};

export type PurchaseTournamentEntryOutput =
  | {
      purchaseId: string;
      status: 'PAID';
    }
  | {
      purchaseId: string;
      status: 'PENDING';
      clientSecret: string;
    };

export class PurchaseTournamentEntry {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly tournamentPurchasesRepository: TournamentPurchasesRepository,
    private readonly walletRepository: WalletRepository,
    private readonly stripeProvider: StripeProvider,
  ) {}

  public async execute(input: PurchaseTournamentEntryInput): Promise<PurchaseTournamentEntryOutput> {
    const method: PurchaseMethod = input.method ?? 'AUTO';

    const tournament = await this.tournamentsRepository.findById(input.tournamentId);
    if (!tournament) throw new NotFoundError('Tournament not found', { tournamentId: input.tournamentId });

    if (tournament.status !== TournamentStatus.SCHEDULED) {
      throw new ForbiddenError('Tournament is not available for purchase', {
        tournamentId: input.tournamentId,
        status: tournament.status,
      });
    }

    const feeMinor = moneyToMinorUnits(tournament.toPrimitives().fee, 2);

    const { purchaseId, status } = await this.tournamentPurchasesRepository.createPendingOnce({
      userId: input.userId,
      tournamentId: input.tournamentId,
    });

    // Already paid earlier.
    if (status === 'PAID' || feeMinor === 0) {
      if (status !== 'PAID') {
        await this.tournamentPurchasesRepository.markPaid({ purchaseId, provider: null });
      }
      return { purchaseId, status: 'PAID' };
    }

    if (method === 'STRIPE') {
      return this.createStripeIntent({
        purchaseId,
        userId: input.userId,
        tournamentId: input.tournamentId,
        feeMinor,
        currency: 'usd',
      });
    }

    if (method === 'WALLET' || method === 'AUTO') {
      const wallet = await this.walletRepository.getWalletBalanceByUserId(input.userId);
      const balanceMinor = moneyToMinorUnits(wallet.balance, 2);

      if (balanceMinor >= feeMinor) {
        const currency = wallet.currency;

        await this.walletRepository.debitWalletForTournamentPurchaseOnce({
          userId: input.userId,
          tournamentPurchaseId: purchaseId,
          amount: tournament.toPrimitives().fee,
          currency,
          reason: 'TOURNAMENT_ENTRY',
        });

        await this.tournamentPurchasesRepository.markPaid({ purchaseId, provider: null });

        return { purchaseId, status: 'PAID' };
      }

      if (method === 'WALLET') {
        throw new ForbiddenError('Insufficient wallet balance', {
          tournamentId: input.tournamentId,
          fee: tournament.toPrimitives().fee,
          currency: wallet.currency,
        });
      }

      // AUTO: fall back to Stripe.
      return this.createStripeIntent({
        purchaseId,
        userId: input.userId,
        tournamentId: input.tournamentId,
        feeMinor,
        currency: 'usd',
      });
    }

    // Should never happen due to union type.
    throw new ForbiddenError('Invalid purchase method');
  }

  private async createStripeIntent(input: {
    purchaseId: string;
    userId: string;
    tournamentId: string;
    feeMinor: number;
    currency: string;
  }): Promise<PurchaseTournamentEntryOutput> {
    const intent = await this.stripeProvider.createTopUpPaymentIntent({
      amountMinor: input.feeMinor,
      currency: input.currency,
      metadata: {
        purchaseId: input.purchaseId,
        userId: input.userId,
        tournamentId: input.tournamentId,
        kind: 'TOURNAMENT_ENTRY',
      },
    });

    await this.tournamentPurchasesRepository.setStripeExternalId({
      purchaseId: input.purchaseId,
      externalId: intent.externalId,
    });

    return {
      purchaseId: input.purchaseId,
      status: 'PENDING',
      clientSecret: intent.clientSecret,
    };
  }
}

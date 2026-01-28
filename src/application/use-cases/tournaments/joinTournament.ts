import type { ParticipantsRepository } from '@/application/ports/participantsRepository';
import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import { ForbiddenError, NotFoundError } from '@/shared/errors/appErrors';
import { TournamentStatus } from '@/domain/entities/tournament';
import { moneyToMinorUnits } from '@/application/use-cases/wallet/money';

export type JoinTournamentInput = {
  userId: string;
  tournamentId: string;
};

export type JoinTournamentOutput = {
  joined: true;
  alreadyJoined: boolean;
};

export class JoinTournament {
  constructor(
    private readonly tournamentsRepository: TournamentsRepository,
    private readonly tournamentPurchasesRepository: TournamentPurchasesRepository,
    private readonly participantsRepository: ParticipantsRepository,
  ) {}

  public async execute(input: JoinTournamentInput): Promise<JoinTournamentOutput> {
    const tournament = await this.tournamentsRepository.findById(input.tournamentId);
    if (!tournament) throw new NotFoundError('Tournament not found', { tournamentId: input.tournamentId });

    const status = tournament.status;
    if (
      status === TournamentStatus.RUNNING ||
      status === TournamentStatus.COMPLETED ||
      status === TournamentStatus.CANCELED
    ) {
      throw new ForbiddenError('Joining is not allowed for this tournament status', {
        tournamentId: input.tournamentId,
        status,
      });
    }

    const primitives = tournament.toPrimitives();
    const feeMinor = moneyToMinorUnits(primitives.fee, 2);

    if (feeMinor > 0) {
      const purchase = await this.tournamentPurchasesRepository.findByUserAndTournament({
        userId: input.userId,
        tournamentId: input.tournamentId,
      });

      if (!purchase || purchase.status !== 'PAID') {
        throw new ForbiddenError('Tournament entry not paid', {
          tournamentId: input.tournamentId,
        });
      }
    }

    const participantCount = await this.participantsRepository.countByTournamentId(input.tournamentId);
    if (participantCount >= primitives.maxParticipants) {
      throw new ForbiddenError('Tournament is full', {
        tournamentId: input.tournamentId,
        maxParticipants: primitives.maxParticipants,
      });
    }

    const created = await this.participantsRepository.createOnce({
      userId: input.userId,
      tournamentId: input.tournamentId,
    });

    return { joined: true, alreadyJoined: !created.created };
  }
}

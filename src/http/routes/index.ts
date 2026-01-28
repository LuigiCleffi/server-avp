import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { tournamentRoutes } from './tournaments';
import { walletRoutes } from './wallet';
import { webhookRoutes } from './webhooks';
import { requestRoutes } from './requests';
import { adminRoutes } from './admin';
import { gamesRoutes } from './games';
import { sdkRoutes } from './sdk';
import { PrismaUsersRepository } from '@/infra/repositories/prismaUsersRepository';
import { PrismaPasswordResetTokensRepository } from '@/infra/repositories/prismaPasswordResetTokensRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { ConsoleMailer } from '@/infra/mailer/consoleMailer';
import { PrismaTournamentsRepository } from '@/infra/repositories/prismaTournamentsRepository';
import { PrismaGamesRepository } from '@/infra/repositories/prismaGamesRepository';
import { PrismaGameApiKeysRepository } from '@/infra/repositories/prismaGameApiKeysRepository';
import { PrismaSdkNoncesRepository } from '@/infra/repositories/prismaSdkNoncesRepository';
import { PrismaSdkEventsRepository } from '@/infra/repositories/prismaSdkEventsRepository';
import { PrismaWalletRepository } from '@/infra/repositories/prismaWalletRepository';
import { PrismaTournamentPurchasesRepository } from '@/infra/repositories/prismaTournamentPurchasesRepository';
import { PrismaParticipantsRepository } from '@/infra/repositories/prismaParticipantsRepository';
import { PrismaTournamentRequestsRepository } from '@/infra/repositories/prismaTournamentRequestsRepository';
import { PrismaCreatorRequestsRepository } from '@/infra/repositories/prismaCreatorRequestsRepository';
import { StripeProviderImpl } from '@/infra/payments/stripeProvider';
import { env } from '@/env';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  const tokenService = new JwtTokenService(env.jwtSecret);
  const secretHasher = new BcryptPasswordHasher();
  const walletRepository = new PrismaWalletRepository();
  const tournamentPurchasesRepository = new PrismaTournamentPurchasesRepository();
  const participantsRepository = new PrismaParticipantsRepository();
  const tournamentRequestsRepository = new PrismaTournamentRequestsRepository();
  const creatorRequestsRepository = new PrismaCreatorRequestsRepository();
  const stripeProvider = new StripeProviderImpl(env.stripeSecretKey, env.stripeWebhookSecret);
  const usersRepository = new PrismaUsersRepository();
  const gamesRepository = new PrismaGamesRepository();
  const gameApiKeysRepository = new PrismaGameApiKeysRepository();
  const sdkNoncesRepository = new PrismaSdkNoncesRepository();
  const sdkEventsRepository = new PrismaSdkEventsRepository();

  await app.register(authRoutes, {
    usersRepository,
    passwordResetTokensRepository: new PrismaPasswordResetTokensRepository(),
    passwordHasher: secretHasher,
    tokenService,
    mailer: new ConsoleMailer(),
  });

  await app.register(tournamentRoutes, {
    tournamentsRepository: new PrismaTournamentsRepository(),
    gamesRepository,
    tokenService,
    tournamentPurchasesRepository,
    participantsRepository,
    walletRepository,
    stripeProvider,
  });

  await app.register(requestRoutes, {
    tokenService,
    tournamentRequestsRepository,
    creatorRequestsRepository,
    gamesRepository,
  });

  await app.register(adminRoutes, {
    tokenService,
    tournamentRequestsRepository,
    creatorRequestsRepository,
    usersRepository,
  });

  await app.register(walletRoutes, {
    tokenService,
    walletRepository,
    stripeProvider,
  });

  await app.register(webhookRoutes, {
    walletRepository,
    stripeProvider,
    tournamentPurchasesRepository,
  });

  await app.register(gamesRoutes, {
    tokenService,
    gamesRepository,
    gameApiKeysRepository,
    secretHasher,
    sdkEventsRepository,
  });

  await app.register(sdkRoutes, {
    gameApiKeysRepository,
    secretHasher,
    sdkNoncesRepository,
    sdkEventsRepository,
  });
}

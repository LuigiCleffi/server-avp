import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { tournamentRoutes } from './tournaments';
import { PrismaUsersRepository } from '@/infra/repositories/prismaUsersRepository';
import { PrismaPasswordResetTokensRepository } from '@/infra/repositories/prismaPasswordResetTokensRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { ConsoleMailer } from '@/infra/mailer/consoleMailer';
import { PrismaTournamentsRepository } from '@/infra/repositories/prismaTournamentsRepository';
import { PrismaGamesRepository } from '@/infra/repositories/prismaGamesRepository';
import { env } from '@/env';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  const tokenService = new JwtTokenService(env.jwtSecret);

  await app.register(authRoutes, {
    usersRepository: new PrismaUsersRepository(),
    passwordResetTokensRepository: new PrismaPasswordResetTokensRepository(),
    passwordHasher: new BcryptPasswordHasher(),
    tokenService,
    mailer: new ConsoleMailer(),
  });

  await app.register(tournamentRoutes, {
    tournamentsRepository: new PrismaTournamentsRepository(),
    gamesRepository: new PrismaGamesRepository(),
    tokenService,
  });
}

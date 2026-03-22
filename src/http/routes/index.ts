import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { PrismaAccountsRepository } from '@/infra/repositories/prismaAccountsRepository';
import { PrismaPasswordResetTokensRepository } from '@/infra/repositories/prismaPasswordResetTokensRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { ConsoleMailer } from '@/infra/mailer/consoleMailer';
import { env } from '@/env';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const tokenService = new JwtTokenService(env.jwtSecret, env.jwtIssuer);
  const secretHasher = new BcryptPasswordHasher();
  const accountsRepository = new PrismaAccountsRepository();

  await app.register(authRoutes, {
    accountsRepository,
    passwordResetTokensRepository: new PrismaPasswordResetTokensRepository(),
    passwordHasher: secretHasher,
    tokenService,
    mailer: new ConsoleMailer(),
  });
}

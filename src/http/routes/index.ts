import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { healthRoutes } from './health';
import { PrismaAccountsRepository } from '@/infra/repositories/prismaAccountsRepository';
import { PrismaMercadoLivreCredentialsRepository } from '@/infra/repositories/prismaMercadoLivreCredentialsRepository';
import { PrismaPasswordResetTokensRepository } from '@/infra/repositories/prismaPasswordResetTokensRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { ConsoleMailer } from '@/infra/mailer/consoleMailer';
import { env } from '@/env';
import { mercadoLivreRoutes } from './mercadoLivre';
import { MercadoLivreTokenService } from '@/application/services/mercadoLivreTokenService';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  const tokenService = new JwtTokenService(env.jwtSecret, env.jwtIssuer);
  const secretHasher = new BcryptPasswordHasher();
  const accountsRepository = new PrismaAccountsRepository();
  const mercadoLivreTokenService = new MercadoLivreTokenService(
    new PrismaMercadoLivreCredentialsRepository(),
  );

  await app.register(authRoutes, {
    accountsRepository,
    passwordResetTokensRepository: new PrismaPasswordResetTokensRepository(),
    passwordHasher: secretHasher,
    tokenService,
    mailer: new ConsoleMailer(),
  });

  await app.register(mercadoLivreRoutes, {
    tokenService: mercadoLivreTokenService,
  });
}

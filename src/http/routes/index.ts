import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { PrismaUsersRepository } from '@/infra/repositories/prismaUsersRepository';
import { PrismaPasswordResetTokensRepository } from '@/infra/repositories/prismaPasswordResetTokensRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { ConsoleMailer } from '@/infra/mailer/consoleMailer';
import { env } from '@/env';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);

  const tokenService = new JwtTokenService(env.jwtSecret);
  const secretHasher = new BcryptPasswordHasher();
  const usersRepository = new PrismaUsersRepository();

  await app.register(authRoutes, {
    usersRepository,
    passwordResetTokensRepository: new PrismaPasswordResetTokensRepository(),
    passwordHasher: secretHasher,
    tokenService,
    mailer: new ConsoleMailer(),
  });
}

import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { PrismaUsersRepository } from '@/infra/repositories/prismaUsersRepository';
import { BcryptPasswordHasher } from '@/infra/auth/bcryptPasswordHasher';
import { JwtTokenService } from '@/infra/auth/jwtTokenService';
import { env } from '@/env';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(authRoutes, {
    usersRepository: new PrismaUsersRepository(),
    passwordHasher: new BcryptPasswordHasher(),
    tokenService: new JwtTokenService(env.jwtSecret),
  });
}

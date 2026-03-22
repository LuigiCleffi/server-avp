import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { TokenService } from '@/application/ports/tokenService';
import { AuthError } from '@/shared/errors/appErrors';

const authHeaderSchema = z
  .string()
  .min(1)
  .regex(/^Bearer\s.+$/, 'Invalid Authorization header');

export type AuthContext = {
  accountId: string;
  role: string;
};

export async function requireAuth(req: FastifyRequest, tokenService: TokenService): Promise<AuthContext> {
  const raw = req.headers.authorization;
  const parsed = authHeaderSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  const token = parsed.data.replace(/^Bearer\s/, '');
  const payload = await tokenService.verifyAccessToken(token);

  return {
    accountId: payload.account_id,
    role: payload.role,
  };
}

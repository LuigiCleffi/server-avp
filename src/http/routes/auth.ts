import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody } from '@/http/validation/zod';
import type { UsersRepository } from '@/application/ports/usersRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { TokenService } from '@/application/ports/tokenService';
import { RegisterUser } from '@/application/use-cases/auth/registerUser';
import { AuthenticateUser } from '@/application/use-cases/auth/authenticateUser';
import { GetMe } from '@/application/use-cases/auth/getMe';
import { requireAuth } from '@/http/auth/authMiddleware';

export type AuthRoutesDeps = {
  usersRepository: UsersRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
};

const registerBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance, deps: AuthRoutesDeps): Promise<void> {
  const registerUser = new RegisterUser(deps.usersRepository, deps.passwordHasher);
  const authenticateUser = new AuthenticateUser(
    deps.usersRepository,
    deps.passwordHasher,
    deps.tokenService,
  );
  const getMe = new GetMe(deps.usersRepository);

  app.post('/auth/register', async (req, reply) => {
    const body = parseBody(req, registerBodySchema);

    const result = await registerUser.execute(body);

    return reply.status(201).send(result);
  });

  app.post('/auth/login', async (req) => {
    const body = parseBody(req, loginBodySchema);

    return authenticateUser.execute(body);
  });

  app.get('/me', async (req) => {
    const auth = await requireAuth(req, deps.tokenService);

    return getMe.execute({ userId: auth.userId });
  });
}

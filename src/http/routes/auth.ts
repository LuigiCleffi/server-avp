import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody } from '@/http/validation/zod';
import type { UsersRepository } from '@/application/ports/usersRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { TokenService } from '@/application/ports/tokenService';
import type { PasswordResetTokensRepository } from '@/application/ports/passwordResetTokensRepository';
import type { Mailer } from '@/application/ports/mailer';
import { RegisterUser } from '@/application/use-cases/auth/registerUser';
import { AuthenticateUser } from '@/application/use-cases/auth/authenticateUser';
import { GetMe } from '@/application/use-cases/auth/getMe';
import { RequestPasswordReset } from '@/application/use-cases/auth/requestPasswordReset';
import { ResetPassword } from '@/application/use-cases/auth/resetPassword';
import { requireAuth } from '@/http/auth/authMiddleware';

export type AuthRoutesDeps = {
  usersRepository: UsersRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  passwordResetTokensRepository: PasswordResetTokensRepository;
  mailer: Mailer;
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

const forgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance, deps: AuthRoutesDeps): Promise<void> {
  const registerUser = new RegisterUser(deps.usersRepository, deps.passwordHasher);
  const authenticateUser = new AuthenticateUser(
    deps.usersRepository,
    deps.passwordHasher,
    deps.tokenService,
  );
  const getMe = new GetMe(deps.usersRepository);
  const requestPasswordReset = new RequestPasswordReset(
    deps.usersRepository,
    deps.passwordResetTokensRepository,
    deps.mailer,
  );
  const resetPassword = new ResetPassword(
    deps.passwordResetTokensRepository,
    deps.usersRepository,
    deps.passwordHasher,
  );

  app.post('/auth/register', async (req, reply) => {
    const body = parseBody(req, registerBodySchema);

    const result = await registerUser.execute(body);

    return reply.status(201).send(result);
  });

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (req) => {
      const body = parseBody(req, loginBodySchema);

      try {
        const result = await authenticateUser.execute(body);

        req.log.info(
          {
            event: 'auth.login.success',
            email: body.email,
          },
          'Login success',
        );

        return result;
      } catch (err) {
        req.log.warn(
          {
            event: 'auth.login.failure',
            email: body.email,
            err,
          },
          'Login failure',
        );
        throw err;
      }
    },
  );

  app.get('/me', async (req) => {
    const auth = await requireAuth(req, deps.tokenService);

    return getMe.execute({ userId: auth.userId });
  });

  app.post(
    '/auth/forgot-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const body = parseBody(req, forgotPasswordBodySchema);

      req.log.info(
        {
          event: 'auth.password_reset.requested',
          email: body.email,
        },
        'Password reset requested',
      );

      await requestPasswordReset.execute(body);

      return reply.status(204).send();
    },
  );

  app.post(
    '/auth/reset-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      const body = parseBody(req, resetPasswordBodySchema);

      try {
        await resetPassword.execute(body);

        req.log.info({ event: 'auth.password_reset.success' }, 'Password reset success');
        return reply.status(204).send();
      } catch (err) {
        req.log.warn({ event: 'auth.password_reset.failure', err }, 'Password reset failure');
        throw err;
      }
    },
  );
}

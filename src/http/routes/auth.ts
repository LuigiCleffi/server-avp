import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody } from '@/http/validation/zod';
import type { AccountsRepository } from '@/application/ports/accountsRepository';
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
import {
  apiErrorResponseSchema,
  noContentSchema,
} from '@/http/openapi/schemas';

export type AuthRoutesDeps = {
  accountsRepository: AccountsRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  passwordResetTokensRepository: PasswordResetTokensRepository;
  mailer: Mailer;
};

const registerBodySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email(),
  password: z.string().min(8),
});

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const forgotPasswordBodySchema = z.object({
  email: z.email(),
});

const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const registerBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
  },
  example: {
    name: 'Mario Rossi',
    email: 'mario@example.com',
    password: 'Str0ngP@ssword!',
  },
} as const;

const loginBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  example: {
    email: 'mario@example.com',
    password: 'Str0ngP@ssword!',
  },
} as const;

const forgotPasswordBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email'],
  properties: {
    email: { type: 'string', format: 'email' },
  },
  example: {
    email: 'mario@example.com',
  },
} as const;

const resetPasswordBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['token', 'password'],
  properties: {
    token: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 8 },
  },
  example: {
    token: 'a2f1c3...reset-token...9d8e7f',
    password: 'An0therStr0ngP@ss!',
  },
} as const;

export async function authRoutes(app: FastifyInstance, deps: AuthRoutesDeps): Promise<void> {
  const registerUser = new RegisterUser(deps.accountsRepository, deps.passwordHasher);
  const authenticateUser = new AuthenticateUser(
    deps.accountsRepository,
    deps.passwordHasher,
    deps.tokenService,
  );
  const getMe = new GetMe(deps.accountsRepository);
  const requestPasswordReset = new RequestPasswordReset(
    deps.accountsRepository,
    deps.passwordResetTokensRepository,
    deps.mailer,
  );
  const resetPassword = new ResetPassword(
    deps.passwordResetTokensRepository,
    deps.accountsRepository,
    deps.passwordHasher,
  );

  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new account',
        body: registerBodyOpenApiSchema,
        response: {
          201: {
            type: 'object',
            additionalProperties: false,
            required: ['accountId'],
            properties: {
              accountId: { type: 'string' },
            },
          },
          400: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
    const body = parseBody(req, registerBodySchema);

    const result = await registerUser.execute(body);

    return reply.status(201).send(result);
    },
  );

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Auth'],
        summary: 'Login and get an access token (JWT includes account_id claim)',
        body: loginBodyOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['token'],
            properties: {
              token: {
                type: 'string',
                description: 'JWT access token. Payload includes account_id and role claims.',
              },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
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

  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get current account profile',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['accountId', 'name', 'email', 'accountType', 'createdAt', 'updatedAt'],
            properties: {
              accountId: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              accountType: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const auth = await requireAuth(req, deps.tokenService);

      return getMe.execute({ accountId: auth.accountId });
    },
  );

  app.post(
    '/auth/forgot-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        body: forgotPasswordBodyOpenApiSchema,
        response: {
          204: noContentSchema,
          400: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
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
      schema: {
        tags: ['Auth'],
        summary: 'Reset password using a reset token',
        body: resetPasswordBodyOpenApiSchema,
        response: {
          204: noContentSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
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

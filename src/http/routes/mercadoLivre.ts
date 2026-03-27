import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MercadoLivreTokenService } from '@/application/services/mercadoLivreTokenService';
import { parseBody } from '@/http/validation/zod';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';

export type MercadoLivreRoutesDeps = {
  tokenService: MercadoLivreTokenService;
};

const authorizeQuerySchema = z.object({
  state: z.string().min(1).optional(),
});

const exchangeBodySchema = z.object({
  code: z.string().min(1),
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

const sellerParamsSchema = z.object({
  sellerId: z.string().min(1),
});

const authorizationUrlResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['authorizationUrl'],
  properties: {
    authorizationUrl: { type: 'string' },
  },
} as const;

const oauthExchangeResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sellerId', 'nickname', 'email', 'expiresAt'],
  properties: {
    sellerId: { type: 'string' },
    nickname: { type: 'string' },
    email: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
} as const;

const credentialStatusResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sellerId', 'expiresAt', 'isExpired', 'isExpiringSoon', 'updatedAt'],
  properties: {
    sellerId: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
    isExpired: { type: 'boolean' },
    isExpiringSoon: { type: 'boolean' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export async function mercadoLivreRoutes(
  app: FastifyInstance,
  deps: MercadoLivreRoutesDeps,
): Promise<void> {
  app.get(
    '/integrations/mercado-livre/oauth/authorize',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Build the Mercado Livre authorization URL',
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            state: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: authorizationUrlResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const query = authorizeQuerySchema.parse(req.query);

      return {
        authorizationUrl: deps.tokenService.buildAuthorizationUrl(query.state),
      };
    },
  );

  app.post(
    '/integrations/mercado-livre/oauth/exchange',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Exchange an OAuth authorization code and persist seller credentials',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: oauthExchangeResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const body = parseBody(req, exchangeBodySchema);
      return deps.tokenService.exchangeCode(body.code);
    },
  );

  app.get(
    '/integrations/mercado-livre/oauth/callback',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'OAuth callback endpoint that exchanges the authorization code and persists credentials',
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 1 },
            state: { type: 'string' },
          },
        },
        response: {
          200: oauthExchangeResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const query = callbackQuerySchema.parse(req.query);
      return deps.tokenService.exchangeCode(query.code);
    },
  );

  app.get(
    '/integrations/mercado-livre/credentials/:sellerId',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Get stored credential status for a seller and auto-refresh if needed',
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['sellerId'],
          properties: {
            sellerId: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: credentialStatusResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const params = sellerParamsSchema.parse(req.params);
      return deps.tokenService.getCredentialStatus(params.sellerId);
    },
  );

  app.post(
    '/integrations/mercado-livre/credentials/:sellerId/refresh',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Force a refresh of stored Mercado Livre credentials for a seller',
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['sellerId'],
          properties: {
            sellerId: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: credentialStatusResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const params = sellerParamsSchema.parse(req.params);
      return deps.tokenService.refreshCredentials(params.sellerId);
    },
  );
}

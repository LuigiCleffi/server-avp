import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { MercadoLivreOrderSyncService } from '@/application/services/mercadoLivreOrderSyncService';
import type { MercadoLivreTokenService } from '@/application/services/mercadoLivreTokenService';
import { parseBody, parseQuery } from '@/http/validation/zod';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';

export type MercadoLivreRoutesDeps = {
  tokenService: MercadoLivreTokenService;
  orderSyncService: MercadoLivreOrderSyncService;
};

const authorizeQuerySchema = z.object({
  state: z.string().min(1).optional(),
});

const exchangeBodySchema = z.object({
  code: z.string().min(1),
});

const importCredentialsBodySchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

const listOrdersQuerySchema = z.object({
  sellerId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const syncOrdersBodySchema = z.object({
  sellerId: z.string().min(1),
  orderStatus: z.string().min(1).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const webhookBodySchema = z
  .object({
    resource: z.string().min(1),
    user_id: z.coerce.number().int().positive(),
    topic: z.string().min(1),
    application_id: z.number().int().positive().optional(),
    attempts: z.number().int().nonnegative().optional(),
    sent: z.string().optional(),
    received: z.string().optional(),
  })
  .passthrough();

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

const orderSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['orderId', 'sellerId', 'status', 'totalAmount', 'nfeStatus', 'updatedAt'],
  properties: {
    orderId: { type: 'string' },
    sellerId: { type: 'string' },
    status: { type: 'string' },
    totalAmount: { type: 'string' },
    shippingId: { type: 'string', nullable: true },
    packId: { type: 'string', nullable: true },
    nfeStatus: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const localOrdersResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sellerId', 'orders'],
  properties: {
    sellerId: { type: 'string' },
    orders: {
      type: 'array',
      items: orderSummarySchema,
    },
  },
} as const;

const syncOrdersResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sellerId', 'totalRemote', 'syncedCount', 'orders'],
  properties: {
    sellerId: { type: 'string' },
    totalRemote: { type: 'integer' },
    syncedCount: { type: 'integer' },
    orders: {
      type: 'array',
      items: orderSummarySchema,
    },
  },
} as const;

const webhookResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'topic', 'sellerId', 'orderId'],
  properties: {
    status: { type: 'string', enum: ['processed', 'ignored'] },
    topic: { type: 'string' },
    sellerId: { type: 'string' },
    orderId: { type: 'string', nullable: true },
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

  app.post(
    '/integrations/mercado-livre/credentials/import',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Persist an existing Mercado Livre access token and refresh token pair',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['accessToken', 'refreshToken', 'expiresIn'],
          properties: {
            accessToken: { type: 'string', minLength: 1 },
            refreshToken: { type: 'string', minLength: 1 },
            expiresIn: { type: 'integer', minimum: 1 },
          },
        },
        response: {
          200: oauthExchangeResponseSchema,
          400: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const body = parseBody(req, importCredentialsBodySchema);

      return deps.tokenService.importCredentials({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        expiresIn: body.expiresIn,
      });
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

  app.post(
    '/integrations/mercado-livre/orders/sync',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Fetch recent Mercado Livre orders for a seller and persist them locally',
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['sellerId'],
          properties: {
            sellerId: { type: 'string', minLength: 1 },
            orderStatus: { type: 'string', minLength: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: syncOrdersResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const body = parseBody(req, syncOrdersBodySchema);
      return deps.orderSyncService.syncRecentOrders(body);
    },
  );

  app.get(
    '/integrations/mercado-livre/orders',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'List locally stored Mercado Livre orders for a seller',
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['sellerId'],
          properties: {
            sellerId: { type: 'string', minLength: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: localOrdersResponseSchema,
          400: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const query = parseQuery(req, listOrdersQuerySchema);
      return deps.orderSyncService.listStoredOrders(query.sellerId, query.limit, query.offset);
    },
  );

  app.post(
    '/integrations/mercado-livre/webhooks/orders',
    {
      schema: {
        tags: ['Mercado Livre'],
        summary: 'Receive Mercado Livre order notifications and update local order mirror',
        body: {
          type: 'object',
          additionalProperties: true,
          required: ['resource', 'user_id', 'topic'],
          properties: {
            resource: { type: 'string', minLength: 1 },
            user_id: {
              oneOf: [
                { type: 'integer', minimum: 1 },
                { type: 'string', minLength: 1 },
              ],
            },
            topic: { type: 'string', minLength: 1 },
            application_id: { type: 'integer', minimum: 1 },
            attempts: { type: 'integer', minimum: 0 },
            sent: { type: 'string' },
            received: { type: 'string' },
          },
        },
        response: {
          200: webhookResponseSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const body = parseBody(req, webhookBodySchema);

      return deps.orderSyncService.processWebhook({
        resource: body.resource,
        user_id: body.user_id,
        topic: body.topic,
        application_id: body.application_id ?? 0,
        attempts: body.attempts ?? 0,
        sent: body.sent ?? new Date().toISOString(),
        received: body.received ?? new Date().toISOString(),
      });
    },
  );
}

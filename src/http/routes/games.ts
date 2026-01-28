import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TokenService } from '@/application/ports/tokenService';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import { requireAuth } from '@/http/auth/authMiddleware';
import { parseBody, parseParams, parseQuery } from '@/http/validation/zod';
import { apiErrorResponseSchema, noContentSchema } from '@/http/openapi/schemas';
import { CreateGame } from '@/application/use-cases/games/createGame';
import { CreateGameApiKey } from '@/application/use-cases/games/createGameApiKey';
import { RotateGameApiKey } from '@/application/use-cases/games/rotateGameApiKey';
import { RevokeGameApiKey } from '@/application/use-cases/games/revokeGameApiKey';
import { GetGameLeaderboard } from '@/application/use-cases/sdk/getGameLeaderboard';
import { GetPlayerHistory } from '@/application/use-cases/sdk/getPlayerHistory';
import type { SdkEventsRepository } from '@/application/ports/sdkEventsRepository';
import { GameGenre } from '@/generated/prisma/client';

export type GamesRoutesDeps = {
  tokenService: TokenService;
  gamesRepository: GamesRepository;
  gameApiKeysRepository: GameApiKeysRepository;
  secretHasher: PasswordHasher;
  sdkEventsRepository: SdkEventsRepository;
};

const createGameBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional().nullable(),
  genre: z.nativeEnum(GameGenre),
  active: z.boolean().optional(),
});

const createGameBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'genre'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    genre: { type: 'string', enum: Object.values(GameGenre) },
    active: { type: 'boolean' },
  },
  example: {
    name: 'Neo Fighters',
    description: 'Competitive 1v1 arena fighter.',
    genre: GameGenre.FIGHTING,
    active: true,
  },
} as const;

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

const idParamsOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
} as const;

const revokeParamsSchema = z.object({
  id: z.string().uuid(),
  apiKeyId: z.string().uuid(),
});

const revokeParamsOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'apiKeyId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    apiKeyId: { type: 'string', format: 'uuid' },
  },
} as const;

const apiKeyResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'clientId', 'secret'],
  properties: {
    id: { type: 'string' },
    clientId: { type: 'string' },
    secret: { type: 'string' },
  },
} as const;

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

const leaderboardEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['playerId', 'score', 'lastOccurredAt'],
  properties: {
    playerId: { type: 'string' },
    score: { type: 'number' },
    lastOccurredAt: { type: 'string' },
  },
} as const;

const playerHistoryParamsSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().min(1),
});

const playerHistoryParamsOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'playerId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    playerId: { type: 'string' },
  },
} as const;

const playerHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  type: z.string().min(1).optional(),
});

const playerHistoryItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['eventId', 'type', 'payload', 'occurredAt', 'receivedAt'],
  properties: {
    eventId: { type: 'string' },
    type: { type: 'string' },
    payload: {},
    occurredAt: { type: 'string' },
    receivedAt: { type: 'string' },
  },
} as const;

export async function gamesRoutes(app: FastifyInstance, deps: GamesRoutesDeps): Promise<void> {
  const createGame = new CreateGame(deps.gamesRepository, deps.gameApiKeysRepository, deps.secretHasher);
  const createGameApiKey = new CreateGameApiKey(
    deps.gamesRepository,
    deps.gameApiKeysRepository,
    deps.secretHasher,
  );
  const rotateGameApiKey = new RotateGameApiKey(
    deps.gamesRepository,
    deps.gameApiKeysRepository,
    deps.secretHasher,
  );
  const revokeGameApiKey = new RevokeGameApiKey(deps.gamesRepository, deps.gameApiKeysRepository);
  const getGameLeaderboard = new GetGameLeaderboard(deps.gamesRepository, deps.sdkEventsRepository);
  const getPlayerHistory = new GetPlayerHistory(deps.gamesRepository, deps.sdkEventsRepository);

  app.get(
    '/games/:id/leaderboard',
    {
      schema: {
        tags: ['Games'],
        summary: 'Get game leaderboard (MVP: computed from SCORE_UPDATED events)',
        params: idParamsOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['gameId', 'items'],
            properties: {
              gameId: { type: 'string' },
              items: { type: 'array', items: leaderboardEntrySchema },
            },
          },
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const params = parseParams(req, idParamsSchema);
      const query = parseQuery(req, leaderboardQuerySchema);

      return getGameLeaderboard.execute({
        gameId: params.id,
        limit: query.limit,
      });
    },
  );

  app.get(
    '/games/:id/players/:playerId/history',
    {
      schema: {
        tags: ['Games'],
        summary: 'Get player event history for a game (query-based MVP)',
        params: playerHistoryParamsOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['gameId', 'playerId', 'items'],
            properties: {
              gameId: { type: 'string' },
              playerId: { type: 'string' },
              items: { type: 'array', items: playerHistoryItemSchema },
            },
          },
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const params = parseParams(req, playerHistoryParamsSchema);
      const query = parseQuery(req, playerHistoryQuerySchema);

      return getPlayerHistory.execute({
        gameId: params.id,
        playerId: params.playerId,
        limit: query.limit,
        type: query.type,
      });
    },
  );

  app.post(
    '/games',
    {
      schema: {
        tags: ['Games'],
        summary: 'Create a game (game creators only)',
        security: [{ bearerAuth: [] }],
        body: createGameBodyOpenApiSchema,
        response: {
          201: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'apiKey'],
            properties: {
              id: { type: 'string' },
              apiKey: apiKeyResponseSchema,
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const auth = await requireAuth(req, deps.tokenService);
      const body = parseBody(req, createGameBodySchema);

      const result = await createGame.execute({
        actor: { userId: auth.userId, role: auth.role },
        name: body.name,
        description: body.description ?? null,
        genre: body.genre,
        active: body.active,
      });

      return reply.status(201).send(result);
    },
  );

  app.post(
    '/games/:id/keys',
    {
      schema: {
        tags: ['Games'],
        summary: 'Create an additional SDK API key for a game',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        response: {
          201: apiKeyResponseSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const auth = await requireAuth(req, deps.tokenService);
      const params = parseParams(req, idParamsSchema);

      const result = await createGameApiKey.execute({
        actor: { userId: auth.userId, role: auth.role },
        gameId: params.id,
      });

      return reply.status(201).send(result);
    },
  );

  app.post(
    '/games/:id/keys/rotate',
    {
      schema: {
        tags: ['Games'],
        summary: 'Rotate SDK API keys for a game (revokes all active keys, creates a new one)',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['revokedCount', 'apiKey'],
            properties: {
              revokedCount: { type: 'integer' },
              apiKey: apiKeyResponseSchema,
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const auth = await requireAuth(req, deps.tokenService);
      const params = parseParams(req, idParamsSchema);

      return rotateGameApiKey.execute({
        actor: { userId: auth.userId, role: auth.role },
        gameId: params.id,
      });
    },
  );

  app.post(
    '/games/:id/keys/:apiKeyId/revoke',
    {
      schema: {
        tags: ['Games'],
        summary: 'Revoke a specific SDK API key for a game',
        security: [{ bearerAuth: [] }],
        params: revokeParamsOpenApiSchema,
        response: {
          204: noContentSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const auth = await requireAuth(req, deps.tokenService);
      const params = parseParams(req, revokeParamsSchema);

      await revokeGameApiKey.execute({
        actor: { userId: auth.userId, role: auth.role },
        gameId: params.id,
        apiKeyId: params.apiKeyId,
      });

      return reply.status(204).send();
    },
  );
}

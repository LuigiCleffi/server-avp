import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TokenService } from '@/application/ports/tokenService';
import type { TournamentRequestsRepository } from '@/application/ports/tournamentRequestsRepository';
import type { CreatorRequestsRepository } from '@/application/ports/creatorRequestsRepository';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import { requireAuth } from '@/http/auth/authMiddleware';
import { parseBody } from '@/http/validation/zod';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';
import { CreateTournamentRequest } from '@/application/use-cases/admin/createTournamentRequest';
import { RequestCreatorStatus } from '@/application/use-cases/admin/requestCreatorStatus';

export type RequestRoutesDeps = {
  tokenService: TokenService;
  tournamentRequestsRepository: TournamentRequestsRepository;
  creatorRequestsRepository: CreatorRequestsRepository;
  gamesRepository: GamesRepository;
};

const createTournamentRequestBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  prizePool: z.coerce.number().min(0),
  fee: z.coerce.number().min(0),
  maxPlayers: z.coerce.number().int().positive(),
  gameId: z.string().uuid(),
  justification: z.string().min(1),
});

export async function requestRoutes(app: FastifyInstance, deps: RequestRoutesDeps): Promise<void> {
  const createTournamentRequest = new CreateTournamentRequest(
    deps.tournamentRequestsRepository,
    deps.gamesRepository,
  );
  const requestCreatorStatus = new RequestCreatorStatus(deps.creatorRequestsRepository);

  app.post(
    '/tournament-requests',
    {
      schema: {
        tags: ['Requests'],
        summary: 'Create a tournament request',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'description', 'startDate', 'prizePool', 'fee', 'maxPlayers', 'gameId', 'justification'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            prizePool: { type: 'number', minimum: 0 },
            fee: { type: 'number', minimum: 0 },
            maxPlayers: { type: 'integer', minimum: 1 },
            gameId: { type: 'string', format: 'uuid' },
            justification: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            additionalProperties: false,
            required: ['requestId'],
            properties: { requestId: { type: 'number' } },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const actor = await requireAuth(req, deps.tokenService);
      const body = parseBody(req, createTournamentRequestBodySchema);

      const result = await createTournamentRequest.execute({
        requestedById: actor.userId,
        title: body.title,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        prizePool: body.prizePool,
        fee: body.fee,
        maxPlayers: body.maxPlayers,
        gameId: body.gameId,
        justification: body.justification,
      });

      return reply.status(201).send(result);
    },
  );

  app.post(
    '/creator-requests',
    {
      schema: {
        tags: ['Requests'],
        summary: 'Request creator status',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['requestId', 'created'],
            properties: {
              requestId: { type: 'string' },
              created: { type: 'boolean' },
            },
          },
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const actor = await requireAuth(req, deps.tokenService);
      return requestCreatorStatus.execute({ userId: actor.userId });
    },
  );
}

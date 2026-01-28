import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody, parseParams, parseQuery } from '@/http/validation/zod';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import type { TokenService } from '@/application/ports/tokenService';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import type { WalletRepository } from '@/application/ports/walletRepository';
import type { StripeProvider } from '@/application/ports/stripeProvider';
import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';
import type { ParticipantsRepository } from '@/application/ports/participantsRepository';
import { TournamentFormat, TournamentStatus } from '@/domain/entities/tournament';
import { ListTournaments } from '@/application/use-cases/tournaments/listTournaments';
import { GetTournamentDetails } from '@/application/use-cases/tournaments/getTournamentDetails';
import { CreateTournament } from '@/application/use-cases/tournaments/createTournament';
import { UpdateTournament } from '@/application/use-cases/tournaments/updateTournament';
import { ChangeTournamentStatus } from '@/application/use-cases/tournaments/changeTournamentStatus';
import { PurchaseTournamentEntry } from '@/application/use-cases/tournaments/purchaseTournamentEntry';
import { JoinTournament } from '@/application/use-cases/tournaments/joinTournament';
import { requireAuth } from '@/http/auth/authMiddleware';
import {
  apiErrorResponseSchema,
  noContentSchema,
} from '@/http/openapi/schemas';

export type TournamentRoutesDeps = {
  tournamentsRepository: TournamentsRepository;
  gamesRepository: GamesRepository;
  tokenService: TokenService;
  tournamentPurchasesRepository: TournamentPurchasesRepository;
  participantsRepository: ParticipantsRepository;
  walletRepository: WalletRepository;
  stripeProvider: StripeProvider;
};

const listQuerySchema = z.object({
  gameId: z.string().uuid().optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  startFrom: z.coerce.date().optional(),
  startTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

const listQueryOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    gameId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: Object.values(TournamentStatus) },
    startFrom: { type: 'string', format: 'date-time' },
    startTo: { type: 'string', format: 'date-time' },
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
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

const createBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  fee: z.string().min(1),
  prizePool: z.string().min(1),
  format: z.nativeEnum(TournamentFormat),
  maxParticipants: z.coerce.number().int().positive(),
  gameId: z.string().uuid(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional().nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    fee: z.string().min(1).optional(),
    prizePool: z.string().min(1).optional(),
    format: z.nativeEnum(TournamentFormat).optional(),
    maxParticipants: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

const changeStatusBodySchema = z.object({
  status: z.nativeEnum(TournamentStatus),
});

const purchaseBodySchema = z.object({
  method: z.enum(['AUTO', 'WALLET', 'STRIPE']).optional().default('AUTO'),
});

const purchaseBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    method: { type: 'string', enum: ['AUTO', 'WALLET', 'STRIPE'], default: 'AUTO' },
  },
} as const;

const createBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'name',
    'startDate',
    'fee',
    'prizePool',
    'format',
    'maxParticipants',
    'gameId',
  ],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    fee: { type: 'string', minLength: 1, description: 'Decimal amount as string, e.g. "10.00"' },
    prizePool: { type: 'string', minLength: 1, description: 'Decimal amount as string, e.g. "100.00"' },
    format: { type: 'string', enum: Object.values(TournamentFormat) },
    maxParticipants: { type: 'integer', minimum: 1 },
    gameId: { type: 'string', format: 'uuid' },
  },
  example: {
    name: 'Weekly Cup #12',
    description: 'Bring your best plays.',
    startDate: '2026-01-20T18:00:00.000Z',
    endDate: null,
    fee: '10.00',
    prizePool: '200.00',
    format: TournamentFormat.SINGLE_ELIMINATION,
    maxParticipants: 64,
    gameId: '11111111-1111-1111-1111-111111111111',
  },
} as const;

const updateBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    fee: { type: 'string', minLength: 1 },
    prizePool: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: Object.values(TournamentFormat) },
    maxParticipants: { type: 'integer', minimum: 1 },
  },
  example: {
    name: 'Weekly Cup #12 (updated)',
    maxParticipants: 128,
  },
} as const;

const changeStatusBodyOpenApiSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', enum: Object.values(TournamentStatus) },
  },
  example: {
    status: TournamentStatus.PENDING_APPROVAL,
  },
} as const;

const tournamentPrimitivesSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'name',
    'description',
    'startDate',
    'endDate',
    'fee',
    'prizePool',
    'format',
    'maxParticipants',
    'status',
    'organizerUserId',
    'gameId',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    startDate: { type: 'string' },
    endDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    fee: { type: 'string' },
    prizePool: { type: 'string' },
    format: { type: 'string', enum: Object.values(TournamentFormat) },
    maxParticipants: { type: 'integer' },
    status: { type: 'string', enum: Object.values(TournamentStatus) },
    organizerUserId: { type: 'string' },
    gameId: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

export async function tournamentRoutes(app: FastifyInstance, deps: TournamentRoutesDeps): Promise<void> {
  const listTournaments = new ListTournaments(deps.tournamentsRepository);
  const getTournamentDetails = new GetTournamentDetails(deps.tournamentsRepository);
  const createTournament = new CreateTournament(deps.tournamentsRepository, deps.gamesRepository);
  const updateTournament = new UpdateTournament(deps.tournamentsRepository);
  const changeTournamentStatus = new ChangeTournamentStatus(deps.tournamentsRepository);
  const purchaseTournamentEntry = new PurchaseTournamentEntry(
    deps.tournamentsRepository,
    deps.tournamentPurchasesRepository,
    deps.walletRepository,
    deps.stripeProvider,
  );
  const joinTournament = new JoinTournament(
    deps.tournamentsRepository,
    deps.tournamentPurchasesRepository,
    deps.participantsRepository,
  );

  app.get(
    '/tournaments',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'List tournaments',
        querystring: listQueryOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['items', 'page', 'pageSize', 'total'],
            properties: {
              items: {
                type: 'array',
                items: tournamentPrimitivesSchema,
              },
              page: { type: 'number' },
              pageSize: { type: 'number' },
              total: { type: 'number' },
            },
          },
          400: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
    const query = parseQuery(req, listQuerySchema);

    return listTournaments.execute({
      gameId: query.gameId,
      status: query.status,
      startFrom: query.startFrom,
      startTo: query.startTo,
      page: query.page,
      pageSize: query.pageSize,
    });
    },
  );

  app.get(
    '/tournaments/:id',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Get tournament details',
        params: idParamsOpenApiSchema,
        response: {
          200: tournamentPrimitivesSchema,
          400: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
    const params = parseParams(req, idParamsSchema);

    return getTournamentDetails.execute({ id: params.id });
    },
  );

  app.post(
    '/tournaments',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Create a tournament',
        security: [{ bearerAuth: [] }],
        body: createBodyOpenApiSchema,
        response: {
          201: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: {
              id: { type: 'string' },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
    const actor = await requireAuth(req, deps.tokenService);
    const body = parseBody(req, createBodySchema);

    const result = await createTournament.execute({
      actor,
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      fee: body.fee,
      prizePool: body.prizePool,
      format: body.format,
      maxParticipants: body.maxParticipants,
      gameId: body.gameId,
    });

    return reply.status(201).send(result);
    },
  );

  app.patch(
    '/tournaments/:id',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Update a tournament',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        body: updateBodyOpenApiSchema,
        response: {
          204: noContentSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
    const actor = await requireAuth(req, deps.tokenService);
    const params = parseParams(req, idParamsSchema);
    const body = parseBody(req, updateBodySchema);

    await updateTournament.execute({
      actor,
      id: params.id,
      ...body,
    });

    return reply.status(204).send();
    },
  );

  app.post(
    '/tournaments/:id/status',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Change tournament status',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        body: changeStatusBodyOpenApiSchema,
        response: {
          204: noContentSchema,
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
    const actor = await requireAuth(req, deps.tokenService);
    const params = parseParams(req, idParamsSchema);
    const body = parseBody(req, changeStatusBodySchema);

    await changeTournamentStatus.execute({
      actor,
      id: params.id,
      status: body.status,
    });

    return reply.status(204).send();
    },
  );

  app.post(
    '/tournaments/:id/purchase',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Purchase tournament entry',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        body: purchaseBodyOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['purchaseId', 'status'],
            properties: {
              purchaseId: { type: 'string' },
              status: { type: 'string', enum: ['PAID', 'PENDING'] },
              clientSecret: { type: 'string' },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          422: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const actor = await requireAuth(req, deps.tokenService);
      const params = parseParams(req, idParamsSchema);
      const body = parseBody(req, purchaseBodySchema);

      return purchaseTournamentEntry.execute({
        userId: actor.userId,
        tournamentId: params.id,
        method: body.method,
      });
    },
  );

  app.post(
    '/tournaments/:id/join',
    {
      schema: {
        tags: ['Tournaments'],
        summary: 'Join a tournament (requires paid entry)',
        security: [{ bearerAuth: [] }],
        params: idParamsOpenApiSchema,
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['joined', 'alreadyJoined'],
            properties: {
              joined: { type: 'boolean' },
              alreadyJoined: { type: 'boolean' },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const actor = await requireAuth(req, deps.tokenService);
      const params = parseParams(req, idParamsSchema);

      return joinTournament.execute({
        userId: actor.userId,
        tournamentId: params.id,
      });
    },
  );
}

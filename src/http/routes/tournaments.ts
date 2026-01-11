import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parseBody, parseParams, parseQuery } from '@/http/validation/zod';
import type { TournamentsRepository } from '@/application/ports/tournamentsRepository';
import type { TokenService } from '@/application/ports/tokenService';
import type { GamesRepository } from '@/application/ports/gamesRepository';
import { TournamentFormat, TournamentStatus } from '@/domain/entities/tournament';
import { ListTournaments } from '@/application/use-cases/tournaments/listTournaments';
import { GetTournamentDetails } from '@/application/use-cases/tournaments/getTournamentDetails';
import { CreateTournament } from '@/application/use-cases/tournaments/createTournament';
import { UpdateTournament } from '@/application/use-cases/tournaments/updateTournament';
import { ChangeTournamentStatus } from '@/application/use-cases/tournaments/changeTournamentStatus';
import { requireAuth } from '@/http/auth/authMiddleware';

export type TournamentRoutesDeps = {
  tournamentsRepository: TournamentsRepository;
  gamesRepository: GamesRepository;
  tokenService: TokenService;
};

const listQuerySchema = z.object({
  gameId: z.string().uuid().optional(),
  status: z.nativeEnum(TournamentStatus).optional(),
  startFrom: z.coerce.date().optional(),
  startTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

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

export async function tournamentRoutes(app: FastifyInstance, deps: TournamentRoutesDeps): Promise<void> {
  const listTournaments = new ListTournaments(deps.tournamentsRepository);
  const getTournamentDetails = new GetTournamentDetails(deps.tournamentsRepository);
  const createTournament = new CreateTournament(deps.tournamentsRepository, deps.gamesRepository);
  const updateTournament = new UpdateTournament(deps.tournamentsRepository);
  const changeTournamentStatus = new ChangeTournamentStatus(deps.tournamentsRepository);

  app.get('/tournaments', async (req) => {
    const query = parseQuery(req, listQuerySchema);

    return listTournaments.execute({
      gameId: query.gameId,
      status: query.status,
      startFrom: query.startFrom,
      startTo: query.startTo,
      page: query.page,
      pageSize: query.pageSize,
    });
  });

  app.get('/tournaments/:id', async (req) => {
    const params = parseParams(req, idParamsSchema);

    return getTournamentDetails.execute({ id: params.id });
  });

  app.post('/tournaments', async (req, reply) => {
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
  });

  app.patch('/tournaments/:id', async (req, reply) => {
    const actor = await requireAuth(req, deps.tokenService);
    const params = parseParams(req, idParamsSchema);
    const body = parseBody(req, updateBodySchema);

    await updateTournament.execute({
      actor,
      id: params.id,
      ...body,
    });

    return reply.status(204).send();
  });

  app.post('/tournaments/:id/status', async (req, reply) => {
    const actor = await requireAuth(req, deps.tokenService);
    const params = parseParams(req, idParamsSchema);
    const body = parseBody(req, changeStatusBodySchema);

    await changeTournamentStatus.execute({
      actor,
      id: params.id,
      status: body.status,
    });

    return reply.status(204).send();
  });
}

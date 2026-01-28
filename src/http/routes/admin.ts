import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TokenService } from '@/application/ports/tokenService';
import type { TournamentRequestsRepository } from '@/application/ports/tournamentRequestsRepository';
import type { CreatorRequestsRepository } from '@/application/ports/creatorRequestsRepository';
import type { UsersRepository } from '@/application/ports/usersRepository';
import { requireAuth } from '@/http/auth/authMiddleware';
import { parseBody, parseParams } from '@/http/validation/zod';
import { apiErrorResponseSchema, noContentSchema } from '@/http/openapi/schemas';
import { ForbiddenError } from '@/shared/errors/appErrors';
import { ReviewTournamentRequest } from '@/application/use-cases/admin/reviewTournamentRequest';
import { ApproveCreatorStatus } from '@/application/use-cases/admin/approveCreatorStatus';

export type AdminRoutesDeps = {
  tokenService: TokenService;
  tournamentRequestsRepository: TournamentRequestsRepository;
  creatorRequestsRepository: CreatorRequestsRepository;
  usersRepository: UsersRepository;
};

const numericIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const uuidParamsSchema = z.object({
  id: z.string().uuid(),
});

const reviewBodySchema = z.object({
  adminNotes: z.string().optional().nullable(),
});

function requireAdmin(role: string): void {
  if (role !== 'ADMIN') {
    throw new ForbiddenError('Admin access required');
  }
}

export async function adminRoutes(app: FastifyInstance, deps: AdminRoutesDeps): Promise<void> {
  const reviewTournamentRequest = new ReviewTournamentRequest(deps.tournamentRequestsRepository);
  const approveCreatorStatus = new ApproveCreatorStatus(
    deps.creatorRequestsRepository,
    deps.usersRepository,
  );

  app.post(
    '/admin/tournament-requests/:id/approve',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Approve a tournament request',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: { type: 'object', additionalProperties: false, properties: { adminNotes: { type: 'string' } } },
        response: {
          204: noContentSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const actor = await requireAuth(req, deps.tokenService);
      requireAdmin(actor.role);

      const params = parseParams(req, numericIdParamsSchema);
      const body = parseBody(req, reviewBodySchema);

      await reviewTournamentRequest.execute({
        id: params.id,
        reviewedById: actor.userId,
        decision: 'APPROVE',
        adminNotes: body.adminNotes ?? null,
      });

      return reply.status(204).send();
    },
  );

  app.post(
    '/admin/tournament-requests/:id/reject',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Reject a tournament request',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
        body: { type: 'object', additionalProperties: false, properties: { adminNotes: { type: 'string' } } },
        response: {
          204: noContentSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const actor = await requireAuth(req, deps.tokenService);
      requireAdmin(actor.role);

      const params = parseParams(req, numericIdParamsSchema);
      const body = parseBody(req, reviewBodySchema);

      await reviewTournamentRequest.execute({
        id: params.id,
        reviewedById: actor.userId,
        decision: 'REJECT',
        adminNotes: body.adminNotes ?? null,
      });

      return reply.status(204).send();
    },
  );

  app.post(
    '/admin/creator-requests/:id/approve',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Approve a creator request',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
        body: { type: 'object', additionalProperties: false, properties: { adminNotes: { type: 'string' } } },
        response: {
          204: noContentSchema,
          401: apiErrorResponseSchema,
          403: apiErrorResponseSchema,
          404: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const actor = await requireAuth(req, deps.tokenService);
      requireAdmin(actor.role);

      const params = parseParams(req, uuidParamsSchema);
      const body = parseBody(req, reviewBodySchema);

      await approveCreatorStatus.execute({
        requestId: params.id,
        adminUserId: actor.userId,
        adminNotes: body.adminNotes ?? null,
      });

      return reply.status(204).send();
    },
  );
}

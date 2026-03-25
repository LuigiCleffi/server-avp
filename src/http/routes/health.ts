import type { FastifyInstance } from 'fastify';
import { dbPool } from '@/infra/db/pool';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';

const healthResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'database'],
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded'] },
    database: { type: 'string', enum: ['up', 'down'] },
  },
} as const;

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Service health check',
        response: {
          200: healthResponseSchema,
          503: healthResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      try {
        await dbPool.query('SELECT 1');
        return reply.status(200).send({ status: 'ok', database: 'up' });
      } catch {
        return reply.status(503).send({ status: 'degraded', database: 'down' });
      }
    },
  );
}

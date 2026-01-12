import type { FastifyInstance } from 'fastify';
import { dbPool } from '@/infra/db/pool';
import { apiErrorResponseSchema, okStatusSchema } from '@/http/openapi/schemas';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        response: {
          200: okStatusSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async () => {
    return { status: 'ok' };
    },
  );

  app.get(
    '/health/db',
    {
      schema: {
        tags: ['Health'],
        summary: 'Database connectivity check',
        response: {
          200: okStatusSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async () => {
    await dbPool.query('SELECT 1');
    return { status: 'ok' };
    },
  );
}

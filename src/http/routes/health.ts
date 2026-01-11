import type { FastifyInstance } from 'fastify';
import { dbPool } from '../../infra/db/pool';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/health/db', async () => {
    await dbPool.query('SELECT 1');
    return { status: 'ok' };
  });
}

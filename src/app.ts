import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { dbPool } from './infra/db/pool';
import { apiError } from './http/errors/apiError';
import { registerCors } from './http/plugins/cors';
import { registerRateLimit } from './http/plugins/rateLimit';
import { registerRoutes } from './http/routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId(req) {
      const headerValue = req.headers['x-request-id'];
      if (typeof headerValue === 'string' && headerValue.length > 0) return headerValue;
      return randomUUID();
    },
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  app.setErrorHandler(async (err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .status(400)
        .send(apiError('VALIDATION_ERROR', 'Invalid request', err.flatten()));
    }

    return reply.status(500).send(apiError('INTERNAL_ERROR', 'Internal server error'));
  });

  await registerCors(app);
  await registerRateLimit(app);
  await registerRoutes(app);

  app.addHook('onClose', async () => {
    await dbPool.end();
  });

  return app;
}


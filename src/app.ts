import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { dbPool } from './infra/db/pool';
import { apiError } from './http/errors/apiError';
import { AppError } from './shared/errors/appErrors';
import { DomainValidationError } from './domain/errors/domainValidationError';
import { registerCors } from './http/plugins/cors';
import { registerRateLimit } from './http/plugins/rateLimit';
import { registerSwagger } from './http/plugins/swagger';
import { registerRoutes } from './http/routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        // We use Zod for request validation; route schemas are primarily for OpenAPI docs.
        // Disable strict schema so OpenAPI extensions like `example` don't crash startup.
        strictSchema: false,
      },
    },
    genReqId(req) {
      const headerValue = req.headers['x-request-id'];
      if (typeof headerValue === 'string' && headerValue.length > 0) return headerValue;
      return randomUUID();
    },
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);

    // Avoid stale Swagger UI/spec in local dev
    if (req.url === '/docs' || req.url.startsWith('/docs/')) {
      reply.header('cache-control', 'no-store');
    }
  });

  app.setErrorHandler(async (err, req, reply) => {
    if (err instanceof ZodError) {
      return reply
        .status(400)
        .send(apiError('VALIDATION_ERROR', 'Invalid request', err.flatten()));
    }

    if (err instanceof DomainValidationError) {
      return reply
        .status(422)
        .send(apiError(err.code, err.message, err.details));
    }

    if (err instanceof AppError) {
      req.log.info(
        { err: { name: err.name, code: err.code, details: err.details } },
        'Request failed with handled error',
      );

      return reply.status(err.statusCode).send(apiError(err.code, err.message, err.details));
    }

    return reply.status(500).send(apiError('INTERNAL_ERROR', 'Internal server error'));
  });

  await registerCors(app);
  await registerRateLimit(app);
  await registerSwagger(app);
  await registerRoutes(app);

  app.addHook('onClose', async () => {
    await dbPool.end();
  });

  return app;
}


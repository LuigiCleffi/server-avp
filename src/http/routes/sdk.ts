import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { GameApiKeysRepository } from '@/application/ports/gameApiKeysRepository';
import type { PasswordHasher } from '@/application/ports/passwordHasher';
import type { SdkEventsRepository } from '@/application/ports/sdkEventsRepository';
import type { SdkNoncesRepository } from '@/application/ports/sdkNoncesRepository';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';
import { AppError } from '@/shared/errors/appErrors';
import { IngestSdkEvent } from '@/application/use-cases/sdk/ingestSdkEvent';

export type SdkRoutesDeps = {
  gameApiKeysRepository: GameApiKeysRepository;
  secretHasher: PasswordHasher;
  sdkNoncesRepository: SdkNoncesRepository;
  sdkEventsRepository: SdkEventsRepository;
};

const sdkHeadersSchema = z.object({
  'x-sdk-client-id': z.string().min(1),
  'x-sdk-secret': z.string().min(1),
  'x-sdk-timestamp': z.coerce.number().int().positive(),
  'x-sdk-nonce': z.string().min(1),
  'x-sdk-signature': z.string().min(1),
});

export async function sdkRoutes(app: FastifyInstance, deps: SdkRoutesDeps): Promise<void> {
  const ingestSdkEvent = new IngestSdkEvent(
    deps.gameApiKeysRepository,
    deps.secretHasher,
    deps.sdkNoncesRepository,
    deps.sdkEventsRepository,
  );

  app.post(
    '/sdk/events',
    {
      config: {
        rawBody: true,
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: (req) => {
            const clientId = (req.headers['x-sdk-client-id'] ?? '') as string;
            return clientId.length > 0 ? `sdk:${clientId}` : req.ip;
          },
        },
      },
      schema: {
        tags: ['SDK'],
        summary: 'Ingest SDK events (authenticated + idempotent)',
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['received'],
            properties: {
              received: { type: 'boolean' },
              duplicate: { type: 'boolean' },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          409: apiErrorResponseSchema,
          429: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const headersParsed = sdkHeadersSchema.safeParse(req.headers);
      if (!headersParsed.success) {
        throw new AppError({
          code: 'SDK_HEADERS_INVALID',
          message: 'Missing or invalid SDK headers',
          statusCode: 400,
          details: headersParsed.error.flatten(),
        });
      }

      if (!req.rawBody) {
        throw new AppError({
          code: 'RAW_BODY_MISSING',
          message: 'Raw body is required for signature verification',
          statusCode: 500,
        });
      }

      const rawBody = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8');

      return ingestSdkEvent.execute({
        rawBody,
        headers: {
          clientId: headersParsed.data['x-sdk-client-id'],
          secret: headersParsed.data['x-sdk-secret'],
          timestamp: headersParsed.data['x-sdk-timestamp'],
          nonce: headersParsed.data['x-sdk-nonce'],
          signature: headersParsed.data['x-sdk-signature'],
        },
      });
    },
  );
}

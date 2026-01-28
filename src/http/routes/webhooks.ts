import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { StripeProvider } from '@/application/ports/stripeProvider';
import type { WalletRepository } from '@/application/ports/walletRepository';
import type { TournamentPurchasesRepository } from '@/application/ports/tournamentPurchasesRepository';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';
import { HandleStripeWebhook } from '@/application/use-cases/wallet/handleStripeWebhook';
import { AppError } from '@/shared/errors/appErrors';

export type WebhookRoutesDeps = {
  stripeProvider: StripeProvider;
  walletRepository: WalletRepository;
  tournamentPurchasesRepository: TournamentPurchasesRepository;
};

const stripeSignatureSchema = z.string().min(1);

export async function webhookRoutes(app: FastifyInstance, deps: WebhookRoutesDeps): Promise<void> {
  const handleStripeWebhook = new HandleStripeWebhook(
    deps.stripeProvider,
    deps.walletRepository,
    deps.tournamentPurchasesRepository,
  );

  app.post(
    '/webhooks/stripe',
    {
      config: {
        rawBody: true,
      },
      schema: {
        tags: ['Webhooks'],
        summary: 'Stripe webhook receiver',
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['received'],
            properties: {
              received: { type: 'boolean' },
            },
          },
          400: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const signatureHeader = stripeSignatureSchema.safeParse(req.headers['stripe-signature']);
      if (!signatureHeader.success) {
        throw new AppError({
          code: 'STRIPE_SIGNATURE_MISSING',
          message: 'Missing Stripe signature header',
          statusCode: 400,
        });
      }

      if (!req.rawBody) {
        throw new AppError({
          code: 'RAW_BODY_MISSING',
          message: 'Raw body is required for webhook verification',
          statusCode: 500,
        });
      }

      const rawBody = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8');

      return handleStripeWebhook.execute({
        rawBody,
        signature: signatureHeader.data,
      });
    },
  );
}

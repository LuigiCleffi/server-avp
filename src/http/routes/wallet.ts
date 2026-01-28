import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { TokenService } from '@/application/ports/tokenService';
import type { WalletRepository } from '@/application/ports/walletRepository';
import type { StripeProvider } from '@/application/ports/stripeProvider';
import { requireAuth } from '@/http/auth/authMiddleware';
import { parseBody, parseQuery } from '@/http/validation/zod';
import { apiErrorResponseSchema } from '@/http/openapi/schemas';
import { GetWallet } from '@/application/use-cases/wallet/getWallet';
import { ListWalletTransactions } from '@/application/use-cases/wallet/listWalletTransactions';
import { CreateStripeTopUpIntent } from '@/application/use-cases/wallet/createStripeTopUpIntent';

export type WalletRoutesDeps = {
  tokenService: TokenService;
  walletRepository: WalletRepository;
  stripeProvider: StripeProvider;
};

const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

const stripeTopUpBodySchema = z.object({
  amount: z.string().min(1),
  currency: z.string().min(3).max(10).optional().default('usd'),
});

export async function walletRoutes(app: FastifyInstance, deps: WalletRoutesDeps): Promise<void> {
  const getWallet = new GetWallet(deps.walletRepository);
  const listWalletTransactions = new ListWalletTransactions(deps.walletRepository);
  const createStripeTopUpIntent = new CreateStripeTopUpIntent(
    deps.walletRepository,
    deps.stripeProvider,
  );

  app.get(
    '/wallet',
    {
      schema: {
        tags: ['Wallet'],
        summary: 'Get current wallet balance',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['walletId', 'currency', 'balance'],
            properties: {
              walletId: { type: 'string' },
              currency: { type: 'string' },
              balance: { type: 'string' },
            },
          },
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const auth = await requireAuth(req, deps.tokenService);
      return getWallet.execute({ userId: auth.userId });
    },
  );

  app.get(
    '/wallet/transactions',
    {
      schema: {
        tags: ['Wallet'],
        summary: 'List wallet ledger entries',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['items', 'page', 'pageSize', 'total'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'type', 'amount', 'currency', 'reason', 'createdAt'],
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
                    amount: { type: 'string' },
                    currency: { type: 'string' },
                    reason: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              page: { type: 'number' },
              pageSize: { type: 'number' },
              total: { type: 'number' },
            },
          },
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const auth = await requireAuth(req, deps.tokenService);
      const query = parseQuery(req, listTransactionsQuerySchema);
      return listWalletTransactions.execute({
        userId: auth.userId,
        page: query.page,
        pageSize: query.pageSize,
      });
    },
  );

  app.post(
    '/wallet/topup/stripe',
    {
      schema: {
        tags: ['Wallet'],
        summary: 'Create a Stripe top-up PaymentIntent',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['amount'],
          properties: {
            amount: { type: 'string', description: 'Decimal amount as string, e.g. "10.00"' },
            currency: { type: 'string', default: 'usd' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['paymentId', 'clientSecret'],
            properties: {
              paymentId: { type: 'string' },
              clientSecret: { type: 'string' },
            },
          },
          400: apiErrorResponseSchema,
          401: apiErrorResponseSchema,
          500: apiErrorResponseSchema,
          503: apiErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const auth = await requireAuth(req, deps.tokenService);
      const body = parseBody(req, stripeTopUpBodySchema);

      return createStripeTopUpIntent.execute({
        userId: auth.userId,
        amount: body.amount,
        currency: body.currency,
      });
    },
  );
}

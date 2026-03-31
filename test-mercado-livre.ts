import { env } from './src/env';
import { MercadoLivreTokenService } from './src/application/services/mercadoLivreTokenService';
import { PrismaMercadoLivreCredentialsRepository } from './src/infra/repositories/prismaMercadoLivreCredentialsRepository';
import { MercadoLivreProviderImpl } from './src/infra/externalApis';
import { prisma } from './src/infra/prisma/client';
import { dbPool } from './src/infra/db/pool';

type CliOptions = {
  sellerId?: string;
  accessToken?: string;
  skipOrders: boolean;
  limit: number;
};

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    skipOrders: false,
    limit: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--seller-id') {
      options.sellerId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--access-token') {
      options.accessToken = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--skip-orders') {
      options.skipOrders = true;
      continue;
    }

    if (arg === '--limit') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value <= 0 || value > 50) {
        throw new Error('Invalid --limit value. Use an integer between 1 and 50.');
      }

      options.limit = value;
      index += 1;
    }
  }

  return options;
}

function ensureMercadoLivreConfig(): void {
  if (!env.mercadoLivreClientId || !env.mercadoLivreClientSecret || !env.mercadoLivreRedirectUri) {
    throw new Error(
      'Missing Mercado Livre config in .env: MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET, MERCADO_LIVRE_REDIRECT_URI.',
    );
  }
}

function normalizeCliAccessToken(value?: string): string | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return undefined;
  }

  return normalized;
}

async function resolveAccessToken(options: CliOptions): Promise<string> {
  if (options.accessToken !== undefined) {
    const normalizedToken = normalizeCliAccessToken(options.accessToken);
    if (!normalizedToken) {
      throw new Error(
        'Invalid --access-token value. It looks empty/null. Token exchange likely failed (for example: invalid_grant).',
      );
    }

    return normalizedToken;
  }

  if (!options.sellerId) {
    throw new Error(
      'Provide --access-token or --seller-id. For --seller-id, credentials must already exist in database (ml_credentials).',
    );
  }

  const tokenService = new MercadoLivreTokenService(new PrismaMercadoLivreCredentialsRepository());
  return tokenService.getValidAccessToken(options.sellerId);
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  ensureMercadoLivreConfig();

  console.log('\n[Mercado Livre] Starting integration smoke test...');
  const accessToken = await resolveAccessToken(options);

  const provider = new MercadoLivreProviderImpl({
    clientId: env.mercadoLivreClientId,
    clientSecret: env.mercadoLivreClientSecret,
    redirectUri: env.mercadoLivreRedirectUri,
    accessToken,
  });

  const user = await provider.getAuthenticatedUser();
  console.log(`[OK] Authenticated user -> id=${user.id}, nickname=${user.nickname}`);

  const categories = await provider.getCategories('MLB');
  console.log(`[OK] Categories API -> received ${categories.length} categories`);

  if (!options.skipOrders) {
    const sellerId = options.sellerId ?? String(user.id);
    const orders = await provider.listOrders({
      sellerId,
      limit: options.limit,
      sort: 'date_desc',
    });

    console.log(
      `[OK] Orders API -> seller=${sellerId}, returned=${orders.results.length}, total=${orders.paging.total}`,
    );
  } else {
    console.log('[SKIP] Orders API test skipped via --skip-orders');
  }

  console.log('[DONE] Mercado Livre integration smoke test passed.\n');
}

function stringifySafely(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const details = error as {
      statusCode?: number;
      externalServiceName?: string;
      originalError?: { response?: { data?: unknown } };
      cause?: unknown;
    };

    const parts = [error.message || error.name];

    if (details.statusCode !== undefined) {
      parts.push(`status=${details.statusCode}`);
    }

    if (details.externalServiceName) {
      parts.push(`service=${details.externalServiceName}`);
    }

    const responseData = details.originalError?.response?.data;
    if (responseData !== undefined) {
      parts.push(`response=${stringifySafely(responseData)}`);
    } else if (details.cause !== undefined) {
      parts.push(`cause=${stringifySafely(details.cause)}`);
    }

    return parts.join(' | ');
  }

  return stringifySafely(error);
}

main()
  .catch((error: unknown) => {
    const message = formatError(error);
    console.error(`\n[FAIL] Mercado Livre integration smoke test failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await dbPool.end();
  });

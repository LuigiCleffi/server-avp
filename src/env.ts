import 'dotenv/config';
import { z } from 'zod';

export type Env = {
  databaseUrl: string;
  awsRegion: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbSslEnabled: boolean;
  dbSslRejectUnauthorized: boolean;
  rdsIamAuthEnabled: boolean;
  jwtSecret: string;
  jwtIssuer: string;
  mercadoLivreClientId: string;
  mercadoLivreClientSecret: string;
  mercadoLivreRedirectUri: string;
  mercadoLivreAccessToken: string;
  mercadoLivreRefreshToken: string;
  host: string;
  port: number;
};

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AWS_REGION: z.string().min(1).optional().default('us-east-1'),
  DB_HOST: z.string().optional().default(''),
  DB_PORT: z.coerce.number().int().positive().optional().default(5432),
  DB_NAME: z.string().optional().default(''),
  DB_USER: z.string().optional().default(''),
  DB_SSL_ENABLED: z.coerce.boolean().optional().default(false),
  DB_SSL_REJECT_UNAUTHORIZED: z.coerce.boolean().optional().default(true),
  RDS_IAM_AUTH_ENABLED: z.coerce.boolean().optional().default(false),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ISSUER: z.string().min(1).optional().default('avp-issuer'),
  HOST: z.string().min(1).optional().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().optional().default(3000),
  MERCADO_LIVRE_CLIENT_ID: z.string().optional().default(''),
  MERCADO_LIVRE_CLIENT_SECRET: z.string().optional().default(''),
  MERCADO_LIVRE_CLIENT_CODE: z.string().optional().default(''),
  MERCADO_LIVRE_REDIRECT_URI: z.string().optional().default(''),
  MERCADO_LIVRE_ACCESS_TOKEN: z.string().optional().default(''),
  MERCADO_LIVRE_REFRESH_TOKEN: z.string().optional().default('')
});

const parsed = rawEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const message =
    'Invalid environment variables. Create a .env file (see .env.example).\n' +
    parsed.error.issues
      .map((issue) => {
        const key = issue.path.join('.') || 'env';
        return `- ${key}: ${issue.message}`;
      })
      .join('\n');

  throw new Error(message);
}

export const env: Env = {
  databaseUrl: parsed.data.DATABASE_URL,
  awsRegion: parsed.data.AWS_REGION,
  dbHost: parsed.data.DB_HOST,
  dbPort: parsed.data.DB_PORT,
  dbName: parsed.data.DB_NAME,
  dbUser: parsed.data.DB_USER,
  dbSslEnabled: parsed.data.DB_SSL_ENABLED,
  dbSslRejectUnauthorized: parsed.data.DB_SSL_REJECT_UNAUTHORIZED,
  rdsIamAuthEnabled: parsed.data.RDS_IAM_AUTH_ENABLED,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtIssuer: parsed.data.JWT_ISSUER,
  mercadoLivreClientId: parsed.data.MERCADO_LIVRE_CLIENT_ID,
  mercadoLivreClientSecret: parsed.data.MERCADO_LIVRE_CLIENT_SECRET,
  mercadoLivreRedirectUri: parsed.data.MERCADO_LIVRE_REDIRECT_URI,
  mercadoLivreAccessToken: parsed.data.MERCADO_LIVRE_ACCESS_TOKEN,
  mercadoLivreRefreshToken: parsed.data.MERCADO_LIVRE_REFRESH_TOKEN,
  host: parsed.data.HOST,
  port: parsed.data.PORT,
};

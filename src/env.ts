import 'dotenv/config';
import { z } from 'zod';

export type Env = {
  databaseUrl: string;
  jwtSecret: string;
  jwtIssuer: string;
  host: string;
  port: number;
};

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ISSUER: z.string().min(1).optional().default('etourney-games'),
  HOST: z.string().min(1).optional().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().optional().default(3000),
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
  jwtSecret: parsed.data.JWT_SECRET,
  jwtIssuer: parsed.data.JWT_ISSUER,
  host: parsed.data.HOST,
  port: parsed.data.PORT,
};

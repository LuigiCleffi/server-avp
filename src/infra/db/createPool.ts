import { URL } from 'node:url';
import { Signer } from '@aws-sdk/rds-signer';
import { Pool, type PoolConfig } from 'pg';
import { env } from '@/env';

function getDatabaseConfigFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
  };
}

function getPoolConfig(): PoolConfig {
  if (!env.rdsIamAuthEnabled) {
    return {
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false }
    };
  }

  const fallback = getDatabaseConfigFromUrl(env.databaseUrl);
  const host = env.dbHost || fallback.host;
  const port = env.dbPort || fallback.port;
  const database = env.dbName || fallback.database;
  const user = env.dbUser || fallback.user;

  const signer = new Signer({
    region: env.awsRegion,
    hostname: host,
    port,
    username: user,
  });

  return {
    host,
    port,
    database,
    user,
    password: async () => signer.getAuthToken(),
  };
}

export const dbPool = new Pool(getPoolConfig());

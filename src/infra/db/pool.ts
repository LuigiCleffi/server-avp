import { Pool } from 'pg';
import { env } from '../../env';

export const dbPool = new Pool({
  connectionString: env.databaseUrl,
});

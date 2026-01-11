import { buildApp } from './app';
import { env } from './env';

async function main() {
  const app = await buildApp();

  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of shutdownSignals) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'Received shutdown signal, shutting down');
      await app.close();
      process.exit(0);
    });
  }

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info({ port: env.port, host: env.host }, 'HTTP server listening');
  } catch (err) {
    app.log.error({ err }, 'Error starting server');
    process.exit(1);
  }
}

void main();

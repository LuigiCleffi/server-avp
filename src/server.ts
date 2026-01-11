import { buildApp } from '@/app';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

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
    await app.listen({ port, host });
    app.log.info({ port, host }, 'HTTP server listening');
  } catch (err) {
    app.log.error({ err }, 'Error starting server');
    process.exit(1);
  }
}

void main();

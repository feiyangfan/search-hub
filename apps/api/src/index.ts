import { loadServerEnv } from '@search-hub/config-env';
import { logger } from '@search-hub/logger';
import { createServer } from './app.js';

const env = loadServerEnv();
const app = createServer();

const server = app
    .listen(env.PORT, () => {
        logger.info({ env: env.NODE_ENV, port: env.PORT }, 'api listening');
    })
    .on('error', (err) => {
        logger.error({ err }, 'Failed to start server:');
        process.exit(1);
    });

async function shutdown(signal: NodeJS.Signals) {
    logger.warn({ signal }, 'shutting down server');

    const shutdownTimer = setTimeout(() => {
        logger.error(
            'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
    }, 5000).unref();

    clearTimeout(shutdownTimer);

    if ('flush' in logger && typeof logger.flush === 'function') {
        await logger.flush();
    }
    process.exit(0);
}
// Graceful shutdown
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

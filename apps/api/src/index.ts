import { loadServerEnv } from '@search-hub/config-env';
import { logger } from '@search-hub/logger';
import { createServer } from './app.js';

const env = loadServerEnv();
const app = createServer();

app.listen(env.PORT, () => {
    logger.info({ env: env.NODE_ENV, port: env.PORT }, 'api listening');
}).on('error', (err) => {
    logger.error({ err }, 'Failed to start server:');
    process.exit(1);
});

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function';

async function shutdown(signal: NodeJS.Signals) {
    logger.warn({ signal }, 'shutting down server');

    const shutdownTimer = setTimeout(() => {
        logger.error(
            'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
    }, 5000).unref();

    clearTimeout(shutdownTimer);

    if (
        typeof (logger as unknown as { flush?: () => unknown }).flush ===
        'function'
    ) {
        const maybePromise = (
            logger as unknown as { flush: () => unknown }
        ).flush();
        if (isPromiseLike(maybePromise)) {
            await maybePromise;
        }
    }
    process.exit(0);
}
// Graceful shutdown
process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
    void shutdown('SIGINT');
});

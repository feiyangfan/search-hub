import type { Server } from 'node:http';

import { loadServerEnv } from '@search-hub/config-env';
import { logger } from '@search-hub/logger';
import { createServer } from './app.js';

const env = loadServerEnv();
const app = createServer();

const server: Server = app.listen(env.PORT, () => {
    logger.info({ env: env.NODE_ENV, port: env.PORT }, 'api listening');
});

server.on('error', (err) => {
    logger.error({ err }, 'Failed to start server:');
    process.exit(1);
});

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function';

let isShuttingDown = false;

const closeServer = async (httpServer: Server) => {
    if (!httpServer.listening) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
};

async function flushLogger() {
    const candidate = logger as unknown as { flush?: () => unknown };

    if (typeof candidate.flush === 'function') {
        const maybePromise = candidate.flush();
        if (isPromiseLike(maybePromise)) {
            await maybePromise;
        }
    }
}

async function shutdown(signal: NodeJS.Signals) {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;

    logger.warn({ signal }, 'shutting down server');

    const shutdownTimer = setTimeout(() => {
        logger.error(
            'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
    }, 5000).unref();

    try {
        await closeServer(server);
        await flushLogger();
        clearTimeout(shutdownTimer);
        process.exit(0);
    } catch (error) {
        clearTimeout(shutdownTimer);
        logger.error({ error }, 'graceful shutdown failed');
        process.exit(1);
    }
}

// Graceful shutdown
process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
    void shutdown('SIGINT');
});

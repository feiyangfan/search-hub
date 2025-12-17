import type { Server } from 'node:http';

import { logger } from './logger.js';
import { createServer } from './app.js';

import { initSessionStore, closeSessionStore } from './session/store.js';
import { env } from './config/env.js';

let server: Server | null = null;

async function bootstrap() {
    logger.info('bootstrap.started');

    logger.info('session_store.initializing');
    await initSessionStore();
    logger.info('session_store.initialized');

    const app = createServer();
    server = app.listen(env.PORT, () => {
        logger.info({ env: env.NODE_ENV, port: env.PORT }, 'server.listening');
    });

    server.on('error', (err) => {
        logger.error({ err }, 'server.start_failed');
        process.exit(1);
    });
}

bootstrap().catch((err: Error) => {
    logger.error({ err }, 'bootstrap.failed');
    process.exit(1);
});

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function';

let isShuttingDown = false;

const closeServer = async (httpServer: Server | null) => {
    if (!httpServer || !httpServer.listening) {
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
        logger.warn({ signal }, 'shutdown.already_in_progress');
        return;
    }
    isShuttingDown = true;

    logger.warn({ signal }, 'shutdown.initiated');

    const shutdownTimer = setTimeout(() => {
        logger.error('shutdown.timeout');
        process.exit(1);
    }, 5000).unref();

    try {
        logger.info('server.closing');
        await closeServer(server);
        logger.info('server.closed');

        logger.info('session_store.closing');
        await closeSessionStore();
        logger.info('session_store.closed');

        logger.info('logger.flushing');
        await flushLogger();

        clearTimeout(shutdownTimer);
        logger.info('shutdown.completed');
        process.exit(0);
    } catch (error) {
        clearTimeout(shutdownTimer);
        logger.error({ error }, 'shutdown.failed');
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

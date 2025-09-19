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

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.error('SIGTERM received, shutting down');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.error('SIGINT received, shutting down');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

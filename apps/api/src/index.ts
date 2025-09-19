import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const server = app
    .listen(env.PORT, () => {
        logger.info(
            `Env: ${env.NODE_ENV}, server listening on port: ${env.PORT}`
        );
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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { logger } from '@search-hub/logger';
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware.js';

export function createServer() {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(pinoHttp({ logger }));
    app.use(cors({ origin: true, credentials: true }));
    app.use(compression());
    app.use(errorHandlerMiddleware);

    app.get('/health', (_req, res) => {
        _req.log.info('health_check');
        res.status(200).json('OK!');
    });

    app.use((_req, res) => {
        res.status(404).json({ message: 'Not Found' });
    });

    return app;
}

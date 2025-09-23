import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { httpLogger } from '@search-hub/logger';

import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware.js';
import { buildRoutes } from './routes/routes.js';

export function createServer() {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Middleware s
    app.use(helmet());
    app.use(httpLogger);
    app.use(cors({ origin: true, credentials: true }));
    app.use(compression());
    app.use(errorHandlerMiddleware);

    app.get('/health', (_req, res) => {
        _req.log.info('health_check');
        res.status(200).json('OK!');
    });

    app.use(buildRoutes());

    app.use((_req, res) => {
        res.status(404).json({ message: 'Not Found' });
    });

    // error handler
    app.use((err: any, _req: any, res: any, _next: any) => {
        // eslint-disable-next-line no-console
        console.error('[api error]', err);
        const status = typeof err?.status === 'number' ? err.status : 500;
        res.status(status).json({
            error:
                status === 500
                    ? 'Internal Server Error'
                    : (err.message ?? 'Error'),
        });
    });

    return app;
}

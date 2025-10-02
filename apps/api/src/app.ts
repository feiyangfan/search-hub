import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { httpLogger } from '@search-hub/logger';
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware.js';
import { createRateLimiter } from './middleware/rateLimitMiddleware.js';

import { buildRoutes } from './routes/routes.js';

import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';

import type { Request, Response } from 'express';

const openapiDoc = JSON.parse(
    readFileSync('openapi/openapi.json', 'utf-8')
) as Record<string, unknown>;

export function createServer(): express.Express {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Middlewares
    app.use(helmet());
    app.use(httpLogger);
    app.use(cors({ origin: true, credentials: true }));
    app.use(compression());

    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

    app.get('/health', (_req, res) => {
        _req.log.info('health_check');
        res.status(200).json({ status: 'ok' });
    });

    app.use('/v1', createRateLimiter());

    app.use(buildRoutes());

    // error handler
    app.use((req: Request, res: Response) => {
        const { id: requestId, log } = req;
        log?.warn(
            { path: req.originalUrl, method: req.method },
            'request_not_found'
        );
        res.status(404).json({
            error: {
                code: 'NOT_FOUND',
                message: 'Resource not found',
                ...(requestId ? { requestId } : {}),
            },
        });
    });

    app.use(errorHandlerMiddleware);

    return app;
}

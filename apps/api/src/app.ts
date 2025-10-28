import express from 'express';
import type { Request, Response } from 'express';

import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import { httpLogger } from '@search-hub/logger';
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware.js';
import { createRateLimiter } from './middleware/rateLimitMiddleware.js';
import { correlationMiddleware } from './middleware/correlationMiddleware.js';
import { authRequired } from './middleware/authMiddleware.js';

import { buildV1Routes } from './routes/routes.js';
import { healthRoutes } from './routes/health.js';
import { buildAuthRoutes } from './routes/auth/index.js';

import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';

import { redisStore } from './session/store.js';
import { env } from './config/env.js';

const openapiDoc = JSON.parse(
    readFileSync('openapi/openapi.json', 'utf-8')
) as Record<string, unknown>;

export function createServer(): express.Express {
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Middlewares
    app.use(helmet());
    app.use(httpLogger);
    app.use(cors({ origin: true, credentials: true }));
    app.use(compression());

    app.use(
        session({
            secret: env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: redisStore,
            cookie: {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 1000 * 60 * 60 * 24, // 1 day
            },
        })
    );

    app.use(correlationMiddleware);

    // Public routes
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
    app.use('/', healthRoutes());
    app.use('/v1/auth', buildAuthRoutes());

    // Rate limiter applied to all /v1 routes
    app.use('/v1', createRateLimiter());

    // Protected routes
    // Authenticate all requests to /v1
    app.use('/v1', authRequired);

    app.use('/v1', buildV1Routes());

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

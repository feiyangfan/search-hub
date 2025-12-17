import { Router } from 'express';
import { createHealthChecker } from '@search-hub/observability';
import { logger as baseLogger } from '../logger.js';
import { prisma } from '@search-hub/db';
import { redisClient as rateLimitRedis } from '../middleware/rateLimitMiddleware.js';
import { redisClient as sessionRedis } from '../session/store.js';

const logger = baseLogger.child({ component: 'health-routes' });

export function healthRoutes() {
    const router = Router();

    // 1. Liveness probe (/health) - Is the server process running?
    router.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'search-hub-api',
        });
    });

    // 2. Readiness probe (/ready) - Is the server ready for traffic?
    const healthChecker = createHealthChecker({
        db: prisma,
        rateLimitRedis,
        sessionRedis,
    });

    router.get('/ready', async (req, res) => {
        const traceId =
            (req.headers['x-trace-id'] as string) || `ready-${Date.now()}`;

        try {
            const healthStatus = await healthChecker();
            const statusCode = healthStatus.status === 'ok' ? 200 : 503;

            if (statusCode === 200) {
                res.status(200).json({
                    status: 'ready',
                    timestamp: healthStatus.timestamp,
                    checks: healthStatus.services,
                    traceId,
                });
            } else {
                logger.warn(
                    { traceId, healthCheck: healthStatus },
                    'Readiness check failed'
                );
                res.status(503).json({
                    status: 'not_ready',
                    timestamp: healthStatus.timestamp,
                    checks: healthStatus.services,
                    traceId,
                });
            }
        } catch (error) {
            logger.error(
                { traceId, error },
                'Readiness probe failed unexpectedly'
            );
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
                traceId,
            });
        }
    });

    return router;
}

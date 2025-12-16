import { Router } from 'express';
import { register, resetMetrics } from '@search-hub/observability';
import { env } from '../config/env.js';

const NODE_ENV = env.NODE_ENV;

export function metricsRoutes() {
    const router = Router();

    // Prometheus scrape endpoint
    router.get('/', async (_req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    // Reset metrics (development only)
    // WARNING: Never expose in production
    if (NODE_ENV !== 'production') {
        router.post('/reset', (_req, res) => {
            resetMetrics();
            res.json({ message: 'Metrics reset successfully' });
        });
    }

    return router;
}

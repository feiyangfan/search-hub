import { createHttpLogger } from '@search-hub/logger';
import { metrics } from '@search-hub/observability';
import { logger } from '../logger.js';
import type { Request, Response, NextFunction } from 'express';

const pinoHttp = createHttpLogger(logger);
/**
 * Request logging middleware
 *
 * Purpose: Log every request with a unique traceId for correlation
 *
 * What it does:
 * 1. Reuses traceId from correlationMiddleware for consistency
 * 2. Logs request start with method, path, user, tenant
 * 3. Logs request completion with status code and duration
 *
 * Why it's important:
 * - Trace correlation: Connect logs across middleware, routes, and errors
 * - Performance monitoring: Track slow requests
 * - Audit trail: Know who did what and when
 * - Debug production: Reconstruct full request lifecycle
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    // Skip logging and metrics for health/metrics endpoints
    // These are scraped frequently and pollute metrics/logs
    if (
        req.path === '/metrics' ||
        req.path === '/metrics/reset' ||
        req.path === '/health' ||
        req.path === '/ready'
    ) {
        return next();
    }

    pinoHttp(req, res);

    // Track metrics separately
    const startTime = Date.now();
    let isTracked = false;

    const trackMetrics = () => {
        if (isTracked) return;
        isTracked = true;

        const duration = (Date.now() - startTime) / 1000;
        const tenantId = req.session?.currentTenantId || 'unknown';

        metrics.apiRequests.inc({
            tenant_id: tenantId,
            endpoint: req.path,
            method: req.method,
            status_code: String(res.statusCode),
        });

        metrics.apiRequestDuration.observe(
            {
                tenant_id: tenantId,
                endpoint: req.path,
                method: req.method,
                status_code: String(res.statusCode),
            },
            duration
        );
    };

    res.on('finish', trackMetrics);
    res.on('close', trackMetrics);

    next();
}

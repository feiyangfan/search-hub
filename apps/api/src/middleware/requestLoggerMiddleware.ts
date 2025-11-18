import { getRequestContext } from '@search-hub/logger';
import { metrics } from '@search-hub/observability';
import type { Request, Response, NextFunction } from 'express';

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

    // Reuse traceId from correlationMiddleware instead of generating new one
    const context = getRequestContext();
    const traceId = context?.traceId || 'unknown';

    // Store traceId on request object for backward compatibility
    req.traceId = traceId;

    const startTime = Date.now();

    // Flag to ensure we only log once (finish OR close, whichever comes first)
    let isLogged = false;

    const logCompletion = () => {
        if (isLogged) return; // Prevent duplicate logs
        isLogged = true;

        try {
            const duration = (Date.now() - startTime) / 1000; // Convert to seconds

            // Track API request metrics
            const tenantId = req.session?.currentTenantId || 'unknown';
            const endpoint = req.path; // e.g., /v1/documents
            const method = req.method; // e.g., POST
            const statusCode = String(res.statusCode); // e.g., 200

            // Increment request counter
            metrics.apiRequests.inc({
                tenant_id: tenantId,
                endpoint,
                method,
                status_code: statusCode,
            });

            // Track request duration histogram
            metrics.apiRequestDuration.observe(
                {
                    tenant_id: tenantId,
                    endpoint,
                    method,
                    status_code: statusCode,
                },
                duration
            );
        } catch (err) {
            // Fallback - don't let logging errors crash the response
            console.error('Request logger error:', err);
        }
    };

    // Log on finish (normal completion)
    res.on('finish', logCompletion);

    // Also log on close (in case of early termination/error)
    res.on('close', logCompletion);

    next();
}

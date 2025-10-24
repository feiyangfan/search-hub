import type { NextFunction, Request, Response } from 'express';
import { setRequestContext, generateTraceId } from '@search-hub/logger';

export function correlationMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // get trace id from header or generate new one
    const traceId = (req.headers['x-trace-id'] as string) || generateTraceId();

    // Extract userId, tenantId, sessionId from request if available
    const userId = req.session?.userId;
    const tenantId = req.session?.currentTenantId;
    const sessionId = req.sessionID;

    // Set the request context for this request
    setRequestContext({ traceId, userId, tenantId, sessionId });

    // Add trace id to response headers for client reference
    res.setHeader('X-Trace-Id', traceId);

    next();
}

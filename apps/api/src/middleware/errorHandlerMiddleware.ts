import type { Request, Response, NextFunction } from 'express';
import { logger, getRequestContext } from '@search-hub/logger';
import { AppError, type ErrorType } from '@search-hub/schemas';
import { ZodError } from 'zod';

// Helper function to map native Node.js/Express errors to our error types
function mapNativeError(error: Error): {
    statusCode: number;
    type: ErrorType;
    code: string;
    userMessage: string;
    metadata: Record<string, unknown>;
} {
    // Handle specific error types
    if (
        error.name === 'ValidationError' ||
        error.message.includes('validation')
    ) {
        return {
            statusCode: 400,
            type: 'validation',
            code: 'VALIDATION_ERROR',
            userMessage: error.message,
            metadata: { originalError: error.name },
        };
    }

    if (
        error.name === 'UnauthorizedError' ||
        error.message.includes('unauthorized')
    ) {
        return {
            statusCode: 401,
            type: 'authentication',
            code: 'AUTH_ERROR',
            userMessage: 'Authentication required',
            metadata: { originalError: error.name },
        };
    }

    if (
        error.name === 'ForbiddenError' ||
        error.message.includes('forbidden')
    ) {
        return {
            statusCode: 403,
            type: 'authorization',
            code: 'AUTHZ_ERROR',
            userMessage: 'Access denied',
            metadata: { originalError: error.name },
        };
    }

    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
        return {
            statusCode: 404,
            type: 'not_found',
            code: 'NOT_FOUND',
            userMessage: 'Resource not found',
            metadata: { originalError: error.name },
        };
    }

    // Database/Connection errors
    if (
        error.name.includes('Connection') ||
        error.message.includes('ECONNREFUSED')
    ) {
        return {
            statusCode: 503,
            type: 'database',
            code: 'DB_CONNECTION_ERROR',
            userMessage: 'Service temporarily unavailable',
            metadata: { originalError: error.name },
        };
    }

    // Rate limiting
    if (
        error.message.includes('rate limit') ||
        error.message.includes('too many requests')
    ) {
        return {
            statusCode: 429,
            type: 'rate_limit',
            code: 'RATE_LIMIT',
            userMessage: 'Too many requests',
            metadata: { originalError: error.name },
        };
    }

    // Default to internal error
    return {
        statusCode: 500,
        type: 'internal',
        code: 'INTERNAL_ERROR',
        userMessage: 'Internal server error',
        metadata: { originalError: error.name },
    };
}

export function errorHandlerMiddleware(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
    // Extract context from correlation or request
    const context = getRequestContext();
    const traceId =
        context?.traceId || (req.headers['x-trace-id'] as string) || 'unknown';
    const userId = context?.userId || req.session?.userId;
    const tenantId = context?.tenantId || req.session?.currentTenantId;

    let statusCode = 500;
    let errorType: ErrorType = 'internal';
    let errorCode = 'INTERNAL_ERROR';
    let metadata: Record<string, unknown> = {};
    let userMessage = 'Internal server error';

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        statusCode = 400;
        errorType = 'validation';
        errorCode = 'VALIDATION_ERROR';
        userMessage = 'Validation error';
        metadata = {
            issues: error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            })),
        };
    }
    // Handle AppError instances (our custom errors)
    else if (error instanceof AppError) {
        statusCode = error.statusCode;
        errorType = error.type;
        errorCode = error.code;
        metadata = error.context.metadata || {};
        userMessage = error.message; // AppErrors are safe to expose
    } else {
        // Handle common Node.js/Express errors
        const mappedError = mapNativeError(error);
        statusCode = mappedError.statusCode;
        errorType = mappedError.type;
        errorCode = mappedError.code;
        userMessage = mappedError.userMessage;
        metadata = mappedError.metadata;
    }

    // Log with full context
    logger.error(
        {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                type: errorType,
                code: errorCode,
            },
            request: {
                method: req.method,
                url: req.url,
                path: req.path,
                query: req.query,
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                referrer: req.headers.referer,
            },
            user: {
                userId,
                tenantId,
                sessionId: context?.sessionId || req.sessionID,
            },
            metadata,
            traceId,
        },
        'Request failed'
    );

    // TODO: Add metrics when metrics package is ready
    // metrics.increment('errors.count', {
    //     type: errorType,
    //     code: errorCode,
    //     statusCode: statusCode.toString(),
    // });

    // Return safe error to client
    res.status(statusCode).json({
        error: {
            message: userMessage,
            code: errorCode,
            traceId,
            ...(statusCode < 500 && Object.keys(metadata).length > 0
                ? { details: metadata }
                : {}),
        },
    });
}

import { z } from 'zod';

// standard API error response
export const ApiError = z.object({
    error: z.object({
        message: z.string(),
        code: z.string(),
        traceId: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
    }),
});

export type ApiErrorType = z.infer<typeof ApiError>;

// Zod schemas for validation and OpenAPI generation
export const ErrorTypeSchema = z.enum([
    'validation',
    'authentication',
    'authorization',
    'not_found',
    'rate_limit',
    'tenant',
    'database',
    'external_api',
    'queue',
    'internal',
]);

export const ErrorContextSchema = z.object({
    type: ErrorTypeSchema,
    code: z.string(),
    operation: z.string(),
    resource: z.string().optional(),
    userId: z.string().optional(),
    tenantId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AppErrorSchema = z.object({
    name: z.string(),
    message: z.string(),
    type: ErrorTypeSchema,
    code: z.string(),
    statusCode: z.number(),
    context: ErrorContextSchema,
    stack: z.string().optional(),
});

export type ErrorType = z.infer<typeof ErrorTypeSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type AppErrorData = z.infer<typeof AppErrorSchema>;

// Error classes for runtime use
export class AppError extends Error {
    public readonly type: ErrorType;
    public readonly code: string;
    public readonly statusCode: number;
    public readonly context: ErrorContext;

    constructor(
        message: string,
        type: ErrorType,
        code: string,
        statusCode: number,
        metadata?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.code = code;
        this.statusCode = statusCode;
        this.context = {
            type,
            code,
            operation: this.getOperationFromStack(),
            metadata,
        };
    }

    private getOperationFromStack(): string {
        // Extract operation from stack trace
        const stack = this.stack?.split('\n')[2];
        const match = stack?.match(/at (\w+)/);
        return match?.[1] || 'unknown';
    }

    // Serialize for logging/API responses
    toJSON(): AppErrorData {
        return {
            name: this.name,
            message: this.message,
            type: this.type,
            code: this.code,
            statusCode: this.statusCode,
            context: this.context,
            stack: this.stack,
        };
    }
}

// Specific error classes
export class ValidationError extends AppError {
    constructor(message: string, field?: string) {
        super(message, 'validation', 'VALIDATION_ERROR', 400, { field });
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string) {
        super(message, 'authentication', 'AUTH_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string, resource?: string) {
        super(message, 'authorization', 'AUTHZ_ERROR', 403, { resource });
        this.name = 'AuthorizationError';
    }
}

// Tenant related errors
export class TenantNotFoundError extends AppError {
    constructor(tenantId: string) {
        super(
            `Tenant with ID ${tenantId} not found`,
            'tenant',
            'TENANT_NOT_FOUND',
            404,
            { tenantId }
        );
        this.name = 'TenantNotFoundError';
    }
}

export class TenantActiveMissingError extends AppError {
    constructor(message: string) {
        super(message, 'tenant', 'TENANT_MISSING', 400);
        this.name = 'TenantAcctiveMissingError';
    }
}

export class TenantAccessDeniedError extends AppError {
    constructor(requestedTenantId: string, userId: string, reason?: string) {
        super(
            `Access denied to tenant ${requestedTenantId} for user ${userId}${
                reason ? `: ${reason}` : ''
            }`,
            'authorization',
            'TENANT_ACCESS_DENIED',
            403,
            { requestedTenantId, userId, reason }
        );
        this.name = 'TenantAccessDeniedError';
    }
}

export class CrossTenantAccessError extends AppError {
    constructor(requestedTenantId: string, userTenantId: string) {
        super(
            'Access denied: Cannot access resources from another tenant',
            'tenant',
            'CROSS_TENANT_ACCESS',
            403,
            { requestedTenantId, userTenantId }
        );
        this.name = 'CrossTenantAccessError';
    }
}

// Document-specific error classes (using existing error types)
export class DocumentNotFoundError extends AppError {
    constructor(documentId: string, tenantId?: string) {
        super(`Document not found`, 'not_found', 'DOCUMENT_NOT_FOUND', 404, {
            documentId,
            tenantId,
        });
        this.name = 'DocumentNotFoundError';
    }
}

export class DocumentAccessDeniedError extends AppError {
    constructor(documentId: string, reason = 'Access denied') {
        super(reason, 'authorization', 'DOCUMENT_ACCESS_DENIED', 403, {
            documentId,
        });
        this.name = 'DocumentAccessDeniedError';
    }
}

export class DocumentIndexingError extends AppError {
    constructor(documentId: string, stage: string, details?: string) {
        super(
            `Document indexing failed at ${stage}${
                details ? `: ${details}` : ''
            }`,
            'queue',
            'DOCUMENT_INDEXING_FAILED',
            500,
            { documentId, stage, details }
        );
        this.name = 'DocumentIndexingError';
    }
}

export class DocumentContentValidationError extends AppError {
    constructor(field: string, message: string) {
        super(message, 'validation', 'DOCUMENT_CONTENT_INVALID', 400, {
            field,
        });
        this.name = 'DocumentContentValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        super(`${resource} not found`, 'not_found', 'NOT_FOUND', 404, {
            resource,
            id,
        });
        this.name = 'NotFoundError';
    }
}

export class RateLimitError extends AppError {
    constructor(limit: number, window: string) {
        super('Rate limit exceeded', 'rate_limit', 'RATE_LIMIT', 429, {
            limit,
            window,
        });
        this.name = 'RateLimitError';
    }
}

export class DatabaseError extends AppError {
    constructor(
        message: string,
        operation: string,
        metadata?: Record<string, unknown>
    ) {
        super(message, 'database', 'DB_ERROR', 500, { operation, ...metadata });
        this.name = 'DatabaseError';
    }
}

export class ExternalApiError extends AppError {
    constructor(service: string, message: string, statusCode?: number) {
        super(
            `${service}: ${message}`,
            'external_api',
            'EXTERNAL_API_ERROR',
            502,
            {
                service,
                originalStatusCode: statusCode,
            }
        );
        this.name = 'ExternalApiError';
    }
}

export class QueueError extends AppError {
    constructor(message: string, jobType: string, jobId?: string) {
        super(message, 'queue', 'QUEUE_ERROR', 500, { jobType, jobId });
        this.name = 'QueueError';
    }
}

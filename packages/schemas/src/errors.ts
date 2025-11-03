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

// General App error kinds
export const ErrorKindSchema = z.enum([
    'validation', // 400
    'authentication', // 401
    'authorization', // 403
    'not_found', // 404
    'conflict', // 409
    'rate_limit', // 429
    'transient', // 503
    'internal', // 500
]);

export type ErrorKindType = z.infer<typeof ErrorKindSchema>;

// HTTP status codes
export const HttpStatusSchema = z.number().int().min(100).max(599);
export type HttpStatusType = z.infer<typeof HttpStatusSchema>;

// Map error kinds to default HTTP status codes
const defaultStatus: Record<ErrorKindType, HttpStatusType> = {
    validation: 422,
    authentication: 401,
    authorization: 403,
    not_found: 404,
    conflict: 409,
    rate_limit: 429,
    transient: 503,
    internal: 500,
};

// Error origins
export const ErrorOriginSchema = z.enum([
    'app', // default
    'client',
    'server',
    'external_service',
    'database',
    'queue',
    'cache',
]);

export type ErrorOriginType = z.infer<typeof ErrorOriginSchema>;

// Error context for logging and debugging
export const ErrorContextSchema = z.object({
    origin: ErrorOriginSchema.default('app'),
    domain: z.string().optional(), // e.g. 'user', 'document', 'tag'
    resource: z.string().optional(), // e.g. 'TenantMembership', 'Document'
    resourceId: z.string().optional(), // e.g. specific resource ID
    operation: z.string().optional(), // e.g. 'create', 'update', 'delete'
    userId: z.string().optional(), // e.g. ID of user making the request
    tenantId: z.string().optional(), // e.g. ID of tenant
    traceId: z.string().optional(), // correlation ID
    metadata: z.record(z.string(), z.unknown()).optional(), // additional info
});

export type ErrorContextType = z.infer<typeof ErrorContextSchema>;

// Generic App error schema
export const AppErrorSchema = z
    .object({
        name: z.string().default('AppError'),
        message: z.string(),
        kind: ErrorKindSchema,
        code: z.string(), // machine-readable error code
        statusCode: HttpStatusSchema.optional(), // HTTP status code
        retryable: z.boolean().optional(),
        retryAfterMs: z.number().int().nonnegative().optional(),
        context: ErrorContextSchema.default({ origin: 'app' }),
        stack: z.string().optional(), // stack trace
        cause: z.any().optional(), // original error
    })
    .transform((e) => ({
        ...e,
        statusCode: e.statusCode ?? defaultStatus[e.kind], // fill default
    }));

export type AppErrorType = z.infer<typeof AppErrorSchema>;

// Error classes for runtime use
export class AppError extends Error {
    public readonly kind: ErrorKindType;
    public readonly code: string;
    public readonly statusCode: HttpStatusType;
    public readonly retryable: boolean;
    public readonly retryAfterMs?: number;
    public readonly context: ErrorContextType;

    constructor(
        message: string,
        kind: ErrorKindType,
        code: string,
        options?: {
            statusCode?: HttpStatusType;
            retryable?: boolean;
            retryAfterMs?: number;
            context?: Partial<ErrorContextType>;
        }
    ) {
        super(message);
        this.name = 'AppError';
        this.kind = kind;
        this.code = code;
        this.statusCode = options?.statusCode ?? defaultStatus[kind];
        this.retryable = options?.retryable ?? false;
        this.retryAfterMs = options?.retryAfterMs;
        this.context = {
            origin: options?.context?.origin ?? 'app',
            domain: options?.context?.domain,
            resource: options?.context?.resource,
            resourceId: options?.context?.resourceId,
            operation: options?.context?.operation,
            userId: options?.context?.userId,
            tenantId: options?.context?.tenantId,
            traceId: options?.context?.traceId,
            metadata: options?.context?.metadata,
        };
    }

    // Serialize for logging/API responses
    toJSON(): AppErrorType {
        return {
            name: this.name,
            message: this.message,
            kind: this.kind,
            code: this.code,
            statusCode: this.statusCode,
            retryable: this.retryable,
            retryAfterMs: this.retryAfterMs,
            context: this.context,
            stack: this.stack,
        };
    }

    /**
     * Create a validation error (422)
     * @example
     * throw AppError.validation('VALIDATION_ERROR', 'Invalid email format', {
     *   context: {
     *     domain: 'user',
     *     metadata: { field: 'email', pattern: /^.+@.+$/ }
     *   }
     * })
     */
    static validation(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'validation', code, options);
        error.name = 'ValidationError';
        return error;
    }

    /**
     * Create an authentication error (401)
     * @example
     * throw AppError.authentication('AUTH_INVALID', 'Invalid credentials', {
     *   context: { metadata: { attemptCount: 3 } }
     * })
     */
    static authentication(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'authentication', code, options);
        error.name = 'AuthenticationError';
        return error;
    }

    /**
     * Create an authorization error (403)
     * @example
     * throw AppError.authorization('AUTHZ_FORBIDDEN', 'Only admins can create tags', {
     *   context: {
     *     domain: 'tags',
     *     operation: 'create',
     *     userId: userId,
     *     tenantId: tenantId,
     *     metadata: { requiredRole: 'admin', userRole: 'member' }
     *   }
     * })
     */
    static authorization(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'authorization', code, options);
        error.name = 'AuthorizationError';
        return error;
    }

    /**
     * Create a not found error (404)
     * @example
     * throw AppError.notFound('TAG_NOT_FOUND', 'Tag not found', {
     *   context: {
     *     domain: 'tags',
     *     resource: 'tag',
     *     resourceId: tagId,
     *     tenantId: tenantId
     *   }
     * })
     */
    static notFound(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'not_found', code, options);
        error.name = 'NotFoundError';
        return error;
    }

    /**
     * Create a conflict error (409)
     * @example
     * throw AppError.conflict('TAG_DUPLICATE', 'Tag with this name already exists', {
     *   context: {
     *     domain: 'tags',
     *     resource: 'tag',
     *     operation: 'create',
     *     tenantId: tenantId,
     *     metadata: { field: 'name', value: 'My Tag', existingId: 'tag-123' }
     *   }
     * })
     */
    static conflict(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'conflict', code, options);
        error.name = 'ConflictError';
        return error;
    }

    /**
     * Create a rate limit error (429)
     * @example
     * throw AppError.rateLimit('RATE_LIMIT_EXCEEDED', 'Too many requests', {
     *   retryAfterMs: 60000,
     *   context: {
     *     userId: userId,
     *     metadata: { limit: 100, window: '1m', current: 150 }
     *   }
     * })
     */
    static rateLimit(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            retryAfterMs?: number;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'rate_limit', code, {
            ...options,
            retryable: true,
        });
        error.name = 'RateLimitError';
        return error;
    }

    /**
     * Create a transient error (503) - temporary failures that can be retried
     * @example
     * throw AppError.transient('DB_CONNECTION_FAILED', 'Database unavailable', {
     *   retryAfterMs: 5000,
     *   context: {
     *     origin: 'database',
     *     operation: 'query',
     *     metadata: { query: 'SELECT ...', attempt: 3 }
     *   }
     * })
     */
    static transient(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            retryAfterMs?: number;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'transient', code, {
            statusCode: 503,
            ...options,
            retryable: true,
        });
        error.name = 'TransientError';
        return error;
    }

    /**
     * Create an internal error (500)
     * @example
     * throw AppError.internal('INTERNAL_ERROR', 'Unexpected error', {
     *   context: {
     *     origin: 'app',
     *     operation: 'processDocument',
     *     metadata: { documentId: 'doc-123', stage: 'embedding' }
     *   }
     * })
     */
    static internal(
        code: string,
        message: string,
        options?: {
            statusCode?: HttpStatusType;
            context?: Partial<ErrorContextType>;
        }
    ): AppError {
        const error = new AppError(message, 'internal', code, {
            statusCode: 500,
            ...options,
        });
        error.name = 'InternalError';
        return error;
    }
}

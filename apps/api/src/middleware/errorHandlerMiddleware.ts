import { ErrorRequestHandler } from 'express';
import { STATUS_CODES } from 'node:http';
import { resolve } from 'node:path';
import { ZodError } from 'zod';
import { logger as fallbackLogger } from '@search-hub/logger';

type NormalizedError = Error &
    Record<string, unknown> & {
        status?: string | string;
        statusCode?: number | string;
        code?: string;
        expose?: boolean;
        details?: unknown;
    };

/** Check if the status is a http status */
const isHttpStatus = (value: unknown): value is number => {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 400 &&
        value <= 599
    );
};

/** Coerce status to number from string if possible */
const coerceStatus = (value: unknown): number | undefined => {
    if (isHttpStatus(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (isHttpStatus(parsed)) {
            return parsed;
        }
    }

    return undefined;
};

const normalizeError = (error: unknown): NormalizedError => {
    // If error already
    if (error instanceof Error) {
        return error as NormalizedError;
    }

    // If object, warp in Error
    if (error && typeof error === 'object') {
        const candidate = error as Record<string, unknown>;
        const normalized = new Error(
            typeof candidate.message === 'string' &&
            candidate.message.trim().length > 0
                ? candidate.message
                : 'Unknown Error'
        );
        Object.assign(normalized, candidate);
        return normalized as NormalizedError;
    }

    // Primitive string, convert to error
    return new Error(
        typeof error === 'string' && error.trim().length > 0
            ? error
            : 'Unknown Error'
    ) as NormalizedError;
};

/** Check status/statusCode, if nothing present, default to 400 for ZodError and 500 for everything else*/
const resolveStatus = (error: NormalizedError, isZodError: boolean): number => {
    // If status in status
    const statusFromStatus = coerceStatus(error.status);
    // Otherwise if status in statusCode
    const status = statusFromStatus ?? coerceStatus(error.statusCode);

    if (typeof status === 'number') {
        return status;
    }

    return isZodError ? 400 : 500;
};

const formatCodeFromStatus = (status: number): string => {
    // A collection of all the standard HTTP response status codes,
    // and the short description of each. For example, http.STATUS_CODES[404] === 'Not Found'.
    const reason = STATUS_CODES[status] ?? 'Error';
    // Map to screaming snake case
    return reason.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
};

/** Return explicit code */
const resolveCode = (
    error: NormalizedError,
    status: number,
    isZodError: boolean
): string => {
    if (isZodError) {
        return 'INVALID_REQUEST';
    }

    if (typeof error.code === 'string' && error.code.trim().length > 0) {
        return error.code;
    }

    return formatCodeFromStatus(status);
};

/** Make message more explicit */
const resolveMessage = (
    error: NormalizedError,
    status: number,
    isZodError: boolean,
    expose: boolean
): string => {
    // For validation error
    if (isZodError) {
        return 'Request validation failed';
    }

    // Only expose original error if expose is true or status < 500
    if (
        expose &&
        typeof error.message === 'string' &&
        error.message.trim().length > 0
    ) {
        return error.message;
    }

    if (status >= 500) {
        return 'Internal Server Error';
    }

    return STATUS_CODES[status] ?? 'Error';
};

const sanitizeDetails = (details: unknown): unknown => {
    if (details instanceof Error) {
        return { message: details.message };
    }

    return details;
};

const resolveDetails = (
    error: NormalizedError,
    isZodError: boolean,
    expose: boolean
): unknown => {
    if (!expose) {
        return undefined;
    }

    if (isZodError) {
        return (error as unknown as ZodError).issues;
    }

    const details =
        (error as Record<string, unknown>).details ??
        (error as Record<string, unknown>).issues ??
        (error as Record<string, unknown>).errors ??
        undefined;

    return sanitizeDetails(details);
};

export const errorHandlerMiddleware: ErrorRequestHandler = (
    incomingError,
    req,
    res,
    next
) => {
    if (incomingError === null) {
        return next();
    }

    if (res.headersSent) {
        return next(incomingError);
    }

    const error = normalizeError(incomingError);
    const isZodError = error instanceof ZodError;

    const status = resolveStatus(error, isZodError);
    const expose = error.expose === true || status < 500;
    const code = resolveCode(error, status, isZodError);
    const message = resolveMessage(error, status, isZodError, expose);
    const details = resolveDetails(error, isZodError, expose);

    const requestId = (req as any)?.id;
    const responseBody = {
        error: {
            code,
            message,
            ...(details !== undefined ? { details } : {}),
            ...(requestId ? { requestId } : {}),
        },
    };

    const log: any = (req as any)?.log ?? fallbackLogger;
    const logLevel: 'error' | 'warn' = status > 500 ? 'error' : 'warn';

    log[logLevel](
        {
            err: error,
            status,
            code,
            requestId,
            path: req.originalUrl,
            method: req.method,
        },
        'request_failed'
    );

    res.status(status).json(responseBody);
};

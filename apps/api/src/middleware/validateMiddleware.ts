import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

type ValidatedRequest = Request & {
    validated?: {
        query?: unknown;
        body?: unknown;
    };
};

export function validateQuery<S extends z.ZodTypeAny>(schema: S) {
    return (req: ValidatedRequest, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return next(parsed.error); // ZodError extends Error
        }

        req.validated = {
            ...(req.validated ?? {}),
            query: parsed.data,
        };
        next();
    };
}

export function validateBody<S extends z.ZodTypeAny>(schema: S) {
    return (req: ValidatedRequest, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return next(parsed.error);
        }

        req.validated = {
            ...(req.validated ?? {}),
            body: parsed.data,
        };
        next();
    };
}

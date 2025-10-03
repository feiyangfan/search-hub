import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';

type ValidationTarget = 'query' | 'body';

type ValidatedRequest = Request & {
    validated?: Partial<Record<ValidationTarget, unknown>>;
};

const applyValidation = <S extends z.ZodTypeAny, K extends ValidationTarget>(
    schema: S,
    target: K
): RequestHandler => {
    return (req, _res, next) => {
        const request = req as ValidatedRequest;
        const parsed = schema.safeParse(request[target]);
        if (!parsed.success) {
            return next(parsed.error); // ZodError extends Error
        }

        request.validated = {
            ...(request.validated ?? {}),
            [target]: parsed.data,
        };

        next();
    };
};

export const validateQuery = <S extends z.ZodTypeAny>(schema: S) =>
    applyValidation(schema, 'query');

export const validateBody = <S extends z.ZodTypeAny>(schema: S) =>
    applyValidation(schema, 'body');

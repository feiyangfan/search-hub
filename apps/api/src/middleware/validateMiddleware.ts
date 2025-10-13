import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';

type ValidationTarget = 'query' | 'body';

export type ValidatedRequest<
    TBody = unknown,
    TQuery = unknown
> = Request & {
    validated?: {
        body?: TBody;
        query?: TQuery;
    };
};

const applyValidation = (
    schema: z.ZodType,
    target: ValidationTarget
): RequestHandler => {
    return (req: ValidatedRequest, _res, next) => {
        const request = req;
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

export const validateQuery = (schema: z.ZodType) =>
    applyValidation(schema, 'query');

export const validateBody = (schema: z.ZodType) =>
    applyValidation(schema, 'body');

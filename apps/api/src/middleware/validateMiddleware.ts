import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/** Validate req.query against a Zod schema; 400 on error. */
export function validateQuery(schema: z.ZodTypeAny) {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.query);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: 'Invalid query', details: parsed.error.issues });
        }
        (req as any).validated = {
            ...(req as any).validated,
            query: parsed.data,
        };
        next();
    };
}

/** Validate req.body against a Zod schema; 400 on error. */
export function validateBody(schema: z.ZodTypeAny) {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: 'Invalid body', details: parsed.error.issues });
        }
        (req as any).validated = {
            ...(req as any).validated,
            body: parsed.data,
        };
        next();
    };
}

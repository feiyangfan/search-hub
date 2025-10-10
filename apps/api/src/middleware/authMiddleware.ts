import type { RequestHandler } from 'express';

export const authRequired: RequestHandler = (req, res, next) => {
    if (!req.session?.userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    next();
};

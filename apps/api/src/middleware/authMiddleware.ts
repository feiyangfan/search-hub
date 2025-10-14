import type { RequestHandler, Request } from 'express';
import type { Session, SessionData } from 'express-session';
import { db } from '@search-hub/db';

type SessionWithUser = Session & SessionData & { userId: string };

export type AuthenticatedRequest = Request & {
    session: SessionWithUser;
};

export const authRequired: RequestHandler = async (req, res, next) => {
    if (!req.session?.userId) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required.',
            },
        });

        return;
    }

    try {
        const user = await db.user.findById({ id: req.session.userId });
        if (!user) {
            return req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    next(destroyErr);
                    return;
                }

                res.status(401).json({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required.',
                    },
                });
            });
        }
    } catch (error) {
        next(error);
        return;
    }

    (req.session as SessionWithUser).userId = req.session.userId;
    next();
};

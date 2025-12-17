import type { RequestHandler, Request } from 'express';
import type { Session, SessionData } from 'express-session';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';
import { metrics } from '@search-hub/observability';

const logger = baseLogger.child({ component: 'auth-middleware' });

type SessionWithUser = Session & SessionData & { userId: string };

export type AuthenticatedRequest = Request & {
    session: SessionWithUser;
};

export const authRequired: RequestHandler = async (req, res, next) => {
    if (!req.session?.userId) {
        logger.warn(
            {
                path: req.path,
                method: req.method,
                sessionId: req.sessionID,
            },
            'session.missing'
        );
        metrics.authAttempts.inc({ method: 'session', status: 'failed' });

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
            logger.warn(
                {
                    userId: req.session.userId,
                    sessionId: req.sessionID,
                },
                'user.not_found'
            );
            metrics.authAttempts.inc({ method: 'session', status: 'failed' });

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

        metrics.authAttempts.inc({ method: 'session', status: 'success' });
    } catch (error) {
        next(error);
        return;
    }

    (req.session as SessionWithUser).userId = req.session.userId;
    next();
};

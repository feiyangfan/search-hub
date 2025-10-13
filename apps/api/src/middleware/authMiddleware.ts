import type { RequestHandler, Request } from 'express';
import type { Session, SessionData } from 'express-session';

type SessionWithUser = Session & SessionData & { userId: string };

export type AuthenticatedRequest = Request & {
    session: SessionWithUser;
};

export const authRequired: RequestHandler = (req, res, next) => {
    if (!req.session?.userId) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Authentication required.',
            },
        });

        return;
    }

    (req.session as SessionWithUser).userId = req.session.userId;
    next();
};

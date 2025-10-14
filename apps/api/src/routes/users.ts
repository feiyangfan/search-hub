import { Router } from 'express';
import {
    DeleteUserPayload,
    type DeleteUserPayload as DeleteUserPayloadBody,
} from '@search-hub/schemas';
import { db } from '@search-hub/db';
import { validateBody } from '../middleware/validateMiddleware.js';
import type { AuthenticatedRequestWithBody } from './types.js';
import { env } from '../config/env.js';
export function userRoutes() {
    const router = Router();
    router.delete(
        '/',
        validateBody(DeleteUserPayload),
        async (req, res, next) => {
            try {
                const request =
                    req as AuthenticatedRequestWithBody<DeleteUserPayloadBody>;
                const {
                    validated: { body },
                    session,
                } = request;
                await db.user.deleteSelf({
                    userId: body.id,
                    requesterId: session.userId,
                });
                session.destroy((destroyErr) => {
                    if (destroyErr) {
                        next(destroyErr);
                        return;
                    }
                    res.clearCookie('connect.sid', {
                        httpOnly: true,
                        sameSite: 'lax',
                        secure: env.NODE_ENV === 'production',
                    });
                    res.status(204).end();
                });
            } catch (error) {
                next(error);
            }
        }
    );
    return router;
}

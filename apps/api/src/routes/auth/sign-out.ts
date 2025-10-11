import { Router } from 'express';
import { env } from '../../config/env.js';

export function signOutRoutes() {
    const router = Router();
    router.post('/', (req, res, next) => {
        req.session.destroy((err) => {
            if (err) {
                next(err);
                return;
            }
            res.clearCookie('connect.sid', {
                httpOnly: true,
                sameSite: 'lax',
                secure: env.NODE_ENV === 'production',
            });
            res.status(204).end();
        });
    });

    return router;
}

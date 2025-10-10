import { Router } from 'express';

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
                secure: process.env.NODE_ENV === 'production',
            });
            res.status(204).end();
        });
    });

    return router;
}

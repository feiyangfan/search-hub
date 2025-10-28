import { signUpRoutes } from './sign-up.js';
import { signInRoutes } from './sign-in.js';
import { signOutRoutes } from './sign-out.js';
import { Router } from 'express';

export function buildAuthRoutes() {
    const router = Router();
    router.use('/sign-up', signUpRoutes());
    router.use('/sign-in', signInRoutes());
    router.use('/sign-out', signOutRoutes());

    return router;
}

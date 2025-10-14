import { signUpRoutes } from './sign-up.js';
import { signInRoutes } from './sign-in.js';
import { signOutRoutes } from './sign-out.js';
import { Router } from 'express';

export function buildAuthRoutes(router: Router) {
    router.use('/v1/auth/sign-up', signUpRoutes());
    router.use('/v1/auth/sign-in', signInRoutes());
    router.use('/v1/auth/sign-out', signOutRoutes());

    return router;
}

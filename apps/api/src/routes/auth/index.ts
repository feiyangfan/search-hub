import { signUpRoutes } from './sign-up.js';
import { signInRoutes } from './sign-in.js';
import { signOutRoutes } from './sign-out.js';
import { oauthSignInRoutes } from './oauth/sign-in.js';
import { Router } from 'express';

export function buildAuthRoutes() {
    const router = Router();
    router.use('/sign-up', signUpRoutes());
    router.use('/sign-in', signInRoutes());
    router.use('/sign-out', signOutRoutes());
    router.use('/oauth/sign-in', oauthSignInRoutes());

    return router;
}

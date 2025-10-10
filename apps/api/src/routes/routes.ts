// routes -> validate -> do work -> respond
import { Router } from 'express';

import { documentRoutes } from './documents.js';
import { tenantRoutes } from './tenants.js';
import { searchRoutes } from './search.js';
import { signUpRoutes } from './auth/sign-up.js';
import { signInRoutes } from './auth/sign-in.js';
import { signOutRoutes } from './auth/sign-out.js';

import { authRequired } from '../middleware/authMiddleware.js';

export function buildRoutes() {
    const router = Router();

    router.use('/v1/auth/sign-up', signUpRoutes());
    router.use('/v1/auth/sign-in', signInRoutes());
    router.use('/v1/auth/sign-out', signOutRoutes());

    router.use('/v1/documents', authRequired, documentRoutes());
    router.use('/v1/tenants', authRequired, tenantRoutes());
    router.use('/v1', authRequired, searchRoutes());

    return router;
}

// routes -> validate -> do work -> respond
import { Router } from 'express';

import { documentRoutes } from './documents.js';
import { tenantRoutes } from './tenants.js';
import { searchRoutes } from './search.js';
import { signUpRoutes } from './auth/sign-up.js';

export function buildRoutes() {
    const router = Router();

    router.use('/v1/documents', documentRoutes());
    router.use('/v1/tenants', tenantRoutes());
    router.use('/v1', searchRoutes());
    router.use('/v1/auth/sign-up', signUpRoutes());

    return router;
}

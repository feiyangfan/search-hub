// routes -> validate -> do work -> respond
import { Router } from 'express';

import { documentRoutes } from './documents.js';
import { tenantRoutes } from './tenants.js';
import { searchRoutes } from './search.js';
import { userRoutes } from './users.js';

export function buildV1Routes() {
    const router = Router();

    router.use('/v1/documents', documentRoutes());
    router.use('/v1/tenants', tenantRoutes());
    router.use('/v1', searchRoutes());
    router.use('/v1/users', userRoutes());

    return router;
}

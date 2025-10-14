// routes -> validate -> do work -> respond
import { Router } from 'express';

import { documentRoutes } from './documents.js';
import { tenantRoutes } from './tenants.js';
import { searchRoutes } from './search.js';
import { userRoutes } from './users.js';

import { authRequired } from '../middleware/authMiddleware.js';
import { buildAuthRoutes } from './auth/index.js';

export function buildRoutes() {
    const router = Router();

    buildAuthRoutes(router);

    router.use('/v1/documents', authRequired, documentRoutes());
    router.use('/v1/tenants', authRequired, tenantRoutes());
    router.use('/v1', authRequired, searchRoutes());
    router.use('/v1/users', authRequired, userRoutes());

    return router;
}

// routes -> validate -> do work -> respond
import { Router } from 'express';

import { documentRoutes } from './documents.js';
import { tenantRoutes } from './tenants.js';
import { searchRoutes } from './search.js';
import { userRoutes } from './users.js';
import { tagRoutes } from './tags.js';

export function buildV1Routes() {
    const router = Router();

    router.use('/documents', documentRoutes());
    router.use('/tenants', tenantRoutes());
    router.use('/', searchRoutes());
    router.use('/users', userRoutes());
    router.use('/tags', tagRoutes());

    return router;
}

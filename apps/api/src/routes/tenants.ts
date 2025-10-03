import { Router, type Request } from 'express';
import { type z } from 'zod';

import { CreateTenantRequest } from '@search-hub/schemas';
import { prisma } from '@search-hub/db';

import { validateBody } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from './types.js';

export function tenantRoutes() {
    const router = Router();

    router.post(
        '/',
        validateBody(CreateTenantRequest),
        async (req: Request, res, next) => {
            try {
                const body = (
                    req as RequestWithValidatedBody<z.infer<typeof CreateTenantRequest>>
                ).validated.body;

                const name = body.name.trim();
                if (!name)
                    return res.status(400).json({ error: 'name is required' });

                // Prevent dup by name (will use unique slug in Prisma)
                const existing = await prisma.tenant.findFirst({
                    where: { name },
                });
                if (existing) return res.status(200).json(existing);

                const tenant = await prisma.tenant.create({ data: { name } });
                res.status(201).json(tenant);
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

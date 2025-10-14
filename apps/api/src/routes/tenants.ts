import { Router } from 'express';

import {
    CreateTenantPayload,
    type CreateTenantPayload as CreateTenantPayloadBody,
} from '@search-hub/schemas';
import { prisma } from '@search-hub/db';

import { validateBody } from '../middleware/validateMiddleware.js';
import type { AuthenticatedRequestWithBody } from './types.js';
import { db } from '@search-hub/db';

export function tenantRoutes() {
    const router = Router();

    router.post(
        '/',
        validateBody(CreateTenantPayload),
        async (req, res, next) => {
            try {
                const reqWithUser =
                    req as AuthenticatedRequestWithBody<CreateTenantPayloadBody>;

                const { body } = reqWithUser.validated;
                const existing = await prisma.tenant.findUnique({
                    where: {
                        name: body.name,
                    },
                });

                if (existing)
                    return res.status(409).json({
                        error: {
                            code: 'TENANT_NAME_EXISTS',
                            message:
                                'A tenant with the same name already exists.',
                        },
                    });

                const userId = reqWithUser.session.userId;
                const tenant = await db.tenant.createWithOwner({
                    name: body.name,
                    ownerId: userId,
                });

                res.status(201).json(tenant);
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

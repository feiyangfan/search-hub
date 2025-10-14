import { Router } from 'express';

import {
    CreateTenantPayload,
    type CreateTenantPayload as CreateTenantPayloadBody,
    DeleteTenantPayload,
    type DeleteTenantPayload as DeleteTenantPayloadBody,
} from '@search-hub/schemas';

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

    router.delete(
        '/',
        validateBody(DeleteTenantPayload),
        async (req, res, next) => {
            try {
                const {
                    validated: { body },
                    session: { userId },
                } =
                    req as AuthenticatedRequestWithBody<DeleteTenantPayloadBody>;

                await db.tenant.deleteOwnedTenant({
                    tenantId: body.id,
                    requesterId: userId,
                });

                res.status(204).end();
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

import { Router } from 'express';

import {
    CreateTenantPayload,
    type CreateTenantPayload as CreateTenantPayloadBody,
    DeleteTenantPayload,
    type DeleteTenantPayload as DeleteTenantPayloadBody,
    ActiveTenantPayload,
    type ActiveTenantPayload as ActiveTenantPayloadBody,
} from '@search-hub/schemas';

import { validateBody } from '../middleware/validateMiddleware.js';
import type { AuthenticatedRequestWithBody } from './types.js';
import { db } from '@search-hub/db';

export function tenantRoutes() {
    const router = Router();

    router.get('/', async (req, res, next) => {
        try {
            const { userId } = req.session ?? {};
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const tenants = await db.tenant.listForUser({ userId });
            res.json({
                tenants,
                activeTenantId: req.session.currentTenantId ?? null,
            });
        } catch (error) {
            next(error);
        }
    });

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
                reqWithUser.session.currentTenantId = tenant.id;
                reqWithUser.session.save((err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    res.status(201).json(tenant);
                });
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

                if (body.id === req.session.currentTenantId) {
                    const tenantList = await db.tenant.listForUser({ userId });
                    req.session.currentTenantId =
                        tenantList[0]?.tenantId ?? undefined;

                    req.session.save((err: Error) => {
                        if (err) {
                            next(err);
                            return;
                        }
                        res.status(204).end();
                    });
                    return;
                }
                res.status(204).end();
            } catch (error) {
                next(error);
            }
        }
    );

    router.post(
        '/active',
        validateBody(ActiveTenantPayload),
        async (req, res, next) => {
            try {
                const reqWithUser =
                    req as AuthenticatedRequestWithBody<ActiveTenantPayloadBody>;
                const { body } = reqWithUser.validated;
                const tenantId = body.id;
                const userId = reqWithUser.session.userId;

                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }

                const tenant = await db.tenant.findById(tenantId);
                if (!tenant) {
                    return res.status(404).json({ error: 'Tenant not found' });
                }

                const memberships = await db.tenant.listForUser({ userId });
                const membership = memberships.find(
                    (item) => item.tenantId === tenantId
                );

                if (!membership) {
                    return res.status(403).json({ error: 'Forbidden' });
                }

                reqWithUser.session.currentTenantId = tenantId;
                reqWithUser.session.save((err) => {
                    if (err) {
                        next(err);
                        return;
                    }
                    res.status(204).end();
                });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

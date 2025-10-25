import { Router } from 'express';
import { authRequired } from '../middleware/authMiddleware.js';

import {
    CreateTenantPayload,
    type CreateTenantPayload as CreateTenantPayloadBody,
    DeleteTenantPayload,
    type DeleteTenantPayload as DeleteTenantPayloadBody,
    ActiveTenantPayload,
    type ActiveTenantPayload as ActiveTenantPayloadBody,
    TenantNotFoundError,
    TenantAccessDeniedError,
    DatabaseError,
} from '@search-hub/schemas';

import { validateBody } from '../middleware/validateMiddleware.js';
import type {
    AuthenticatedRequestWithBody,
    AuthenticatedGetRequest,
} from './types.js';
import { db } from '@search-hub/db';

export function tenantRoutes() {
    const router = Router();

    router.use(authRequired);

    router.get('/', async (req, res, next) => {
        try {
            const authReq = req as AuthenticatedGetRequest;
            const { userId } = authReq.session;

            const tenants = await db.tenant.listForUser({ userId });
            res.json({
                tenants,
                activeTenantId: authReq.session.currentTenantId ?? null,
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
                        next(
                            new DatabaseError(
                                'Failed to save session',
                                'session_save',
                                { userId }
                            )
                        );
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
                            next(
                                new DatabaseError(
                                    'Failed to save session',
                                    'session_save',
                                    { userId }
                                )
                            );
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

                const tenant = await db.tenant.findById(tenantId);
                if (!tenant) {
                    throw new TenantNotFoundError(tenantId);
                }

                const memberships = await db.tenant.listForUser({ userId });
                const membership = memberships.find(
                    (item) => item.tenantId === tenantId
                );

                if (!membership) {
                    throw new TenantAccessDeniedError(
                        tenantId,
                        userId,
                        'User is not a member of this tenant'
                    );
                }

                reqWithUser.session.currentTenantId = tenantId;
                reqWithUser.session.save((err) => {
                    if (err) {
                        next(
                            new DatabaseError(
                                'Failed to save session',
                                'session_save',
                                { userId }
                            )
                        );
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

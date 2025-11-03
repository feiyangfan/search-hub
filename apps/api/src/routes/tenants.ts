import { Router } from 'express';
import { metrics } from '@search-hub/observability';

import {
    CreateTenantPayload,
    type CreateTenantPayload as CreateTenantPayloadBody,
    DeleteTenantPayload,
    type DeleteTenantPayload as DeleteTenantPayloadBody,
    ActiveTenantPayload,
    type ActiveTenantPayload as ActiveTenantPayloadBody,
    AppError,
} from '@search-hub/schemas';

import { validateBody } from '../middleware/validateMiddleware.js';
import type {
    AuthenticatedRequestWithBody,
    AuthenticatedGetRequest,
} from './types.js';
import { db } from '@search-hub/db';

export function tenantRoutes() {
    const router = Router();

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

                // Track tenant creation metric
                metrics.tenantCreations.inc();

                reqWithUser.session.currentTenantId = tenant.id;
                reqWithUser.session.save((err) => {
                    if (err) {
                        next(
                            AppError.internal(
                                'SESSION_SAVE_FAILED',
                                'Failed to save session',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenant',
                                        operation: 'create',
                                        userId,
                                    },
                                }
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
                                AppError.internal(
                                    'SESSION_SAVE_FAILED',
                                    'Failed to save session',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'tenant',
                                            operation: 'delete',
                                            userId,
                                        },
                                    }
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
                    throw AppError.notFound(
                        'TENANT_NOT_FOUND',
                        'Tenant not found',
                        {
                            context: {
                                origin: 'server',
                                domain: 'tenant',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'setActive',
                            },
                        }
                    );
                }

                const memberships = await db.tenant.listForUser({ userId });
                const membership = memberships.find(
                    (item) => item.tenantId === tenantId
                );

                if (!membership) {
                    throw AppError.authorization(
                        'TENANT_ACCESS_DENIED',
                        'User is not a member of this tenant',
                        {
                            context: {
                                origin: 'server',
                                domain: 'tenant',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'setActive',
                                userId,
                            },
                        }
                    );
                }

                reqWithUser.session.currentTenantId = tenantId;
                reqWithUser.session.save((err) => {
                    if (err) {
                        next(
                            AppError.internal(
                                'SESSION_SAVE_FAILED',
                                'Failed to save session',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenant',
                                        operation: 'setActive',
                                        userId,
                                    },
                                }
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

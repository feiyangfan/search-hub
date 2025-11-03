import { Router } from 'express';
import { createTagService } from '../services/tagService.js';
import {
    listTagsQuerySchema,
    ListTagsQueryType,
    createTagRequestSchema,
    CreateTagRequestType,
    getTagParamsSchema,
    GetTagParamsType,
    updateTagParamsSchema,
    UpdateTagParamsType,
    updateTagRequestSchema,
    UpdateTagRequestType,
    AppError,
} from '@search-hub/schemas';

import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
    validateQuery,
    validateBody,
    validateParams,
} from '../middleware/validateMiddleware.js';
import type {
    RequestWithValidatedParams,
    RequestWithValidatedQuery,
    RequestWithValidatedBody,
} from './types.js';

export function tagRoutes() {
    const router = Router();
    const tagService = createTagService();

    router.get(
        '/',
        validateQuery(listTagsQuerySchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'TENANT_ACTIVE_MISSING',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Session',
                            },
                        }
                    );
                }

                const requestWithQuery =
                    req as RequestWithValidatedQuery<ListTagsQueryType>;

                const { tags, total } = await tagService.listTags(
                    requestWithQuery.validated.query,
                    { tenantId: activeTenantId }
                );
                res.json({ tags, total });
            } catch (error) {
                next(error);
            }
        }
    );

    router.post(
        '/',
        validateBody(createTagRequestSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'TENANT_ACTIVE_MISSING',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Session',
                            },
                        }
                    );
                }

                const body = (
                    req as RequestWithValidatedBody<CreateTagRequestType>
                ).validated.body;

                const tag = await tagService.createTag(body, {
                    tenantId: activeTenantId,
                    userId: userId,
                });
                res.status(201).json({ tag });
            } catch (error) {
                next(error);
            }
        }
    );

    router.get(
        '/:id',
        validateParams(getTagParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'TENANT_ACTIVE_MISSING',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Session',
                            },
                        }
                    );
                }

                const { id } = (
                    req as RequestWithValidatedParams<GetTagParamsType>
                ).validated.params;

                const { tag, documentCount } =
                    await tagService.findTagByIdWithCount(id, {
                        tenantId: activeTenantId,
                    });
                res.json({ tag, documentCount });
            } catch (error) {
                next(error);
            }
        }
    );

    router.delete(
        '/:id',
        validateParams(getTagParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;
                const { userId } = authReq.session;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'TENANT_ACTIVE_MISSING',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Session',
                            },
                        }
                    );
                }

                const { id } = (
                    req as RequestWithValidatedParams<GetTagParamsType>
                ).validated.params;

                await tagService.deleteTag(id, {
                    tenantId: activeTenantId,
                    userId: userId,
                });
                res.status(204).send();
            } catch (error) {
                next(error);
            }
        }
    );

    router.patch(
        '/:id',
        validateParams(updateTagParamsSchema),
        validateBody(updateTagRequestSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;
                const { userId } = authReq.session;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'TENANT_ACTIVE_MISSING',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Session',
                            },
                        }
                    );
                }

                const { id } = (
                    req as RequestWithValidatedParams<UpdateTagParamsType>
                ).validated.params;

                const body = (
                    req as RequestWithValidatedBody<UpdateTagRequestType>
                ).validated.body;

                const tag = await tagService.updateTag(id, body, {
                    tenantId: activeTenantId,
                    userId: userId,
                });
                res.json({ tag });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

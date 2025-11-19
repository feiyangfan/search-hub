import { Router } from 'express';

import {
    addTagsToDocumentRequestSchema,
    AddTagsToDocumentRequestType,
    AddTagsToDocumentResponseType,
    DeleteDocumentTagParamsSchema,
    type DeleteDocumentTagParamsType,
    documentIdParamsSchema,
    DocumentIdParamsType,
    GetDocumentTagsResponseType,
    RemoveTagFromDocumentResponseType,
    FavoriteDocumentResponseType,
    UnfavoriteDocumentResponseType,
    updateDocumentIconPayloadSchema,
    type UpdateDocumentIconPayloadType,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';
import {
    createDocumentService,
    type DocumentService,
} from '../services/documentService.js';
import {
    createDocumentRequestSchema,
    type CreateDocumentRequestType,
    getDocumentDetailsParamsSchema,
    type GetDocumentDetailsParamsType,
    getDocumentListParamsSchema,
    type GetDocumentListParamsType,
    updateDocumentTitlePayloadSchema,
    type UpdateDocumentTitlePayloadType,
    AppError,
} from '@search-hub/schemas';

import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
    validateParams,
    validateBody,
    validateQuery,
} from '../middleware/validateMiddleware.js';
import type {
    RequestWithValidatedParams,
    RequestWithValidatedQuery,
    RequestWithValidatedBody,
} from './types.js';

export function documentRoutes(
    service: DocumentService = createDocumentService()
) {
    const router = Router();

    router.get(
        '/',
        validateQuery(getDocumentListParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'list',
                            },
                        }
                    );
                }

                const requestWithQuery =
                    req as RequestWithValidatedQuery<GetDocumentListParamsType>;

                const { limit, cursor, favoritesOnly } =
                    requestWithQuery.validated.query;

                const documents = await service.getDocumentList({
                    tenantId: activeTenantId,
                    userId,
                    limit,
                    cursor,
                    favoritesOnly,
                });

                res.status(200).json({ documents });
            } catch (error) {
                next(error);
            }
        }
    );

    router.post(
        '/',
        validateBody(createDocumentRequestSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'create',
                            },
                        }
                    );
                }

                const body = (
                    req as RequestWithValidatedBody<CreateDocumentRequestType>
                ).validated.body;

                // tenantId now comes from session context only, not from request body
                const payload: CreateDocumentRequestType = {
                    title: body.title?.trim(),
                    source: body.source,
                    sourceUrl: body.sourceUrl,
                    content: body.content,
                    metadata: body.metadata,
                };

                const { documentId } = await service.createAndQueueDocument(
                    payload,
                    {
                        userId,
                        tenantId: activeTenantId,
                    }
                );

                // Track document creation metrics
                // Determine source type based on whether sourceUrl is provided
                const sourceType = body.sourceUrl ? 'link' : 'editor';
                metrics.documentsCreated.inc({
                    tenant_id: activeTenantId,
                    source_type: sourceType,
                });

                res.status(202).json({ id: documentId, status: 'queued' }); // 202 accepted since it's async work (queue)
            } catch (err) {
                next(err);
            }
        }
    );

    router.get(
        '/:id',
        validateParams(getDocumentDetailsParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'getDetails',
                            },
                        }
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const document = await service.getDocumentDetails(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                if (!document) {
                    throw AppError.notFound(
                        'DOCUMENT_NOT_FOUND',
                        'Document not found',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                resource: 'Document',
                                resourceId: documentId,
                                operation: 'getDetails',
                                tenantId: activeTenantId,
                            },
                        }
                    );
                }

                res.status(200).json({ document });
            } catch (error) {
                next(error);
            }
        }
    );

    router.delete(
        '/:id',
        validateParams(getDocumentDetailsParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'delete',
                            },
                        }
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                await service.deleteDocument(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                res.status(204).end();
            } catch (error) {
                next(error);
            }
        }
    );

    router.patch(
        '/:id/title',
        validateParams(getDocumentDetailsParamsSchema),
        validateBody(updateDocumentTitlePayloadSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'updateTitle',
                            },
                        }
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const requestWithBody =
                    req as RequestWithValidatedBody<UpdateDocumentTitlePayloadType>;
                const { title } = requestWithBody.validated.body;

                const document = await service.updateDocumentTitle(
                    documentId,
                    {
                        userId,
                        tenantId: activeTenantId,
                    },
                    { title }
                );

                res.status(200).json({ document });
            } catch (error) {
                next(error);
            }
        }
    );

    router.patch('/:id/content', async (req, res, next) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { userId } = authReq.session;
            const activeTenantId = authReq.session?.currentTenantId;

            if (!activeTenantId) {
                throw AppError.validation(
                    'NO_ACTIVE_TENANT',
                    'No active tenant selected.',
                    {
                        context: {
                            origin: 'server',
                            domain: 'document',
                            operation: 'updateContent',
                        },
                    }
                );
            }

            const documentId = req.params.id;

            const body = req.body as { content: string };

            const document = await service.updateDocumentContent(
                documentId,
                {
                    userId,
                    tenantId: activeTenantId,
                },
                { content: body.content }
            );

            res.status(200).json({ document });
        } catch (error) {
            next(error);
        }
    });

    router.patch(
        '/:id/icon',
        validateParams(getDocumentDetailsParamsSchema),
        validateBody(updateDocumentIconPayloadSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'updateIcon',
                            },
                        }
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentIdFromParams } =
                    requestWithParams.validated.params;

                const requestWithBody =
                    req as RequestWithValidatedBody<UpdateDocumentIconPayloadType>;

                const { iconEmoji } = requestWithBody.validated.body;

                const document = await service.updateDocumentIcon(
                    documentIdFromParams,
                    {
                        userId,
                        tenantId: activeTenantId,
                    },
                    {
                        iconEmoji: iconEmoji ?? null,
                    }
                );

                res.status(200).json({ document });
            } catch (error) {
                next(error);
            }
        }
    );

    router.post('/:id/reindex', async (req, res, next) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { userId } = authReq.session;
            const activeTenantId = authReq.session?.currentTenantId;
            if (!activeTenantId) {
                throw AppError.validation(
                    'NO_ACTIVE_TENANT',
                    'No active tenant selected.',
                    {
                        context: {
                            origin: 'server',
                            domain: 'document',
                            operation: 'reindex',
                        },
                    }
                );
            }

            const documentId = req.params.id;

            const jobId = await service.queueDocumentReindexing(documentId, {
                userId,
                tenantId: activeTenantId,
            });

            res.status(202).json({
                message: 'Re-index job queued successfully',
                jobId,
            });
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id/tags', async (req, res, next) => {
        try {
            const authReq = req as AuthenticatedRequest;
            const { userId } = authReq.session;

            const activeTenantId = authReq.session?.currentTenantId;

            if (!activeTenantId) {
                throw AppError.validation(
                    'NO_ACTIVE_TENANT',
                    'No active tenant selected.',
                    {
                        context: {
                            origin: 'server',
                            domain: 'document',
                            operation: 'getTags',
                        },
                    }
                );
            }

            const documentId = req.params.id;

            const tags = await service.getDocumentTags(documentId, {
                userId,
                tenantId: activeTenantId,
            });

            const response: GetDocumentTagsResponseType = { tags };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    });

    router.post(
        '/:id/tags',
        validateBody(addTagsToDocumentRequestSchema),
        validateParams(documentIdParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'addTags',
                            },
                        }
                    );
                }

                const body = (
                    req as RequestWithValidatedBody<AddTagsToDocumentRequestType>
                ).validated.body;

                const { id: documentId } = (
                    req as RequestWithValidatedParams<DocumentIdParamsType>
                ).validated.params;
                const response: AddTagsToDocumentResponseType =
                    await service.addTagsToDocument(
                        documentId,
                        {
                            userId,
                            tenantId: activeTenantId,
                        },
                        body
                    );
                res.status(200).json(response);
            } catch (error) {
                next(error);
            }
        }
    );

    router.delete(
        '/:id/tags/:tagId',
        validateParams(DeleteDocumentTagParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'removeTag',
                            },
                        }
                    );
                }

                const { id: documentId, tagId } = (
                    req as RequestWithValidatedParams<DeleteDocumentTagParamsType>
                ).validated.params;

                await service.removeTagFromDocument(
                    documentId,
                    {
                        userId,
                        tenantId: activeTenantId,
                    },
                    { tagId }
                );

                const response: RemoveTagFromDocumentResponseType = {
                    message: 'Tag removed from document',
                };

                res.status(200).json(response);
            } catch (error) {
                next(error);
            }
        }
    );

    router.post(
        '/:id/favorite',
        validateParams(documentIdParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'favorite',
                            },
                        }
                    );
                }

                const { id: documentId } = (
                    req as RequestWithValidatedParams<DocumentIdParamsType>
                ).validated.params;

                await service.favoriteDocument(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                const response: FavoriteDocumentResponseType = {
                    message: 'Document favorited successfully',
                };

                res.status(200).json(response);
            } catch (error) {
                next(error);
            }
        }
    );

    router.post(
        '/:id/unfavorite',
        validateParams(documentIdParamsSchema),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'document',
                                operation: 'unfavorite',
                            },
                        }
                    );
                }

                const { id: documentId } = (
                    req as RequestWithValidatedParams<DocumentIdParamsType>
                ).validated.params;

                await service.unfavoriteDocument(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                const response: UnfavoriteDocumentResponseType = {
                    message: 'Document unfavorited successfully',
                };
                res.status(200).json(response);
            } catch (error) {
                next(error);
            }
        }
    );
    return router;
}

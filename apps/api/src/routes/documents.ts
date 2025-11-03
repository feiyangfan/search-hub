import { Router } from 'express';

import {
    CreateDocumentRequest,
    CreateDocumentRequestType,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import {
    createDocumentService,
    type DocumentService,
} from '../services/documentService.js';
import {
    GetDocumentDetailsParams,
    type GetDocumentDetailsParamsType,
    GetDocumentListParams,
    type GetDocumentListParamsType,
    UpdateDocumentTitlePayload,
    type UpdateDocumentTitlePayloadType,
    AppError,
} from '@search-hub/schemas';
import {
    validateParams,
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
        validateQuery(GetDocumentListParams),
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

                const { limit, offset, favoritesOnly } =
                    requestWithQuery.validated.query;

                const documents = await service.getDocumentList({
                    tenantId: activeTenantId,
                    userId,
                    limit,
                    offset,
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
        validateBody(CreateDocumentRequest),
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
        validateParams(GetDocumentDetailsParams),
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
        validateParams(GetDocumentDetailsParams),
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
        validateParams(GetDocumentDetailsParams),
        validateBody(UpdateDocumentTitlePayload),
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

    return router;
}

import { Router } from 'express';

import {
    CreateDocumentRequest,
    CreateDocumentRequestType,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';
import {
    AuthenticatedRequest,
    authRequired,
} from '../middleware/authMiddleware.js';
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
    TenantActiveMissingError,
    DocumentAccessDeniedError,
    DocumentNotFoundError,
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
    router.use(authRequired);

    router.get(
        '/',
        validateQuery(GetDocumentListParams),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const { userId } = authReq.session;

                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw new TenantActiveMissingError(
                        'No active tenant selected.'
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
                    throw new TenantActiveMissingError(
                        'No active tenant selected.'
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
                    throw new TenantActiveMissingError(
                        'No active tenant selected.'
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
                    throw new DocumentNotFoundError(documentId, activeTenantId);
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
                    throw new TenantActiveMissingError(
                        'No active tenant selected.'
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const result = await service.deleteDocument(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                if (!result.success) {
                    if (result.error === 'forbidden') {
                        throw new DocumentAccessDeniedError(documentId);
                    }
                    // result.error === 'not_found'
                    throw new DocumentNotFoundError(documentId, activeTenantId);
                }

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
                    throw new TenantActiveMissingError(
                        'No active tenant selected.'
                    );
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const requestWithBody =
                    req as RequestWithValidatedBody<UpdateDocumentTitlePayloadType>;
                const { title } = requestWithBody.validated.body;

                const result = await service.updateDocumentTitle(
                    documentId,
                    {
                        userId,
                        tenantId: activeTenantId,
                    },
                    { title }
                );

                if (!result.success) {
                    switch (result.error) {
                        case 'forbidden':
                            throw new DocumentAccessDeniedError(documentId);
                        case 'not_found':
                            throw new DocumentNotFoundError(
                                documentId,
                                activeTenantId
                            );
                        case 'invalid':
                            return res.status(400).json({
                                error: {
                                    code: 'INVALID_TITLE',
                                    message: 'Title cannot be empty.',
                                },
                            });
                    }
                }

                // TypeScript now knows result.success === true
                res.status(200).json({ document: result.document });
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
                throw new TenantActiveMissingError(
                    'No active tenant selected.'
                );
            }

            const documentId = req.params.id;

            const body = req.body as { content: string };

            const result = await service.updateDocumentContent(
                documentId,
                {
                    userId,
                    tenantId: activeTenantId,
                },
                { content: body.content }
            );

            if (!result.success) {
                if (result.error === 'forbidden') {
                    throw new DocumentAccessDeniedError(documentId);
                }
                // result.error === 'not_found'
                throw new DocumentNotFoundError(documentId, activeTenantId);
            }

            res.status(200).json({ document: result.document });
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
                throw new TenantActiveMissingError(
                    'No active tenant selected.'
                );
            }

            const documentId = req.params.id;

            const result = await service.queueDocumentReindexing(documentId, {
                userId,
                tenantId: activeTenantId,
            });

            // Translate domain errors to HTTP errors
            if (!result.success) {
                if (result.error === 'forbidden') {
                    throw new DocumentAccessDeniedError(documentId);
                }
                // result.error === 'not_found'
                throw new DocumentNotFoundError(documentId, activeTenantId);
            }

            // At this point, TypeScript knows result.success === true
            // Translate domain result to HTTP response (schema-compliant)
            res.status(202).json({
                message: 'Re-index job queued successfully',
                jobId: result.jobId,
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

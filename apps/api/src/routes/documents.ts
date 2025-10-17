import { Router } from 'express';

import {
    CreateDocumentRequest,
    CreateDocumentRequestType,
} from '@search-hub/schemas';

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
                const { userId } = req.session ?? {};
                const activeTenantId = req.session?.currentTenantId;

                if (!userId) {
                    return res.status(401).json({
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required.',
                        },
                    });
                }

                if (!activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'TENANT_MISSING',
                            message: 'No active tenant selected.',
                        },
                    });
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
                const { userId } = req.session ?? {};
                const activeTenantId = req.session?.currentTenantId;

                if (!userId) {
                    return res.status(401).json({
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required.',
                        },
                    });
                }

                if (!activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'TENANT_MISSING',
                            message: 'No active tenant selected.',
                        },
                    });
                }

                const body = (
                    req as RequestWithValidatedBody<CreateDocumentRequestType>
                ).validated.body;

                const reqTenantId = body.tenantId;

                if (reqTenantId && reqTenantId !== activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'CROSS_TENANTS_SUBMISSION',
                            message: 'Tenant mismatch',
                        },
                    });
                }

                const payload = {
                    ...body,
                    tenantId: activeTenantId,
                    title: body.title?.trim() || undefined,
                    sourceUrl: body.sourceUrl?.trim() || undefined,
                    content: body.content?.trim() || undefined,
                    metadata:
                        body.metadata && Object.keys(body.metadata).length > 0
                            ? body.metadata
                            : undefined,
                };

                const { documentId } = await service.createAndQueueDocument(
                    payload,
                    {
                        userId,
                        tenantId: activeTenantId,
                    }
                );

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
                const { userId } = req.session ?? {};
                const activeTenantId = req.session?.currentTenantId;

                if (!userId) {
                    return res.status(401).json({
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required.',
                        },
                    });
                }

                if (!activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'TENANT_MISSING',
                            message: 'No active tenant selected.',
                        },
                    });
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const document = await service.getDocumentDetails(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                if (!document) {
                    return res.status(404).json({
                        error: {
                            code: 'DOCUMENT_NOT_FOUND',
                            message: 'Document not found.',
                        },
                    });
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
                const { userId } = req.session ?? {};
                const activeTenantId = req.session?.currentTenantId;

                if (!userId) {
                    return res.status(401).json({
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required.',
                        },
                    });
                }

                if (!activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'TENANT_MISSING',
                            message: 'No active tenant selected.',
                        },
                    });
                }

                const requestWithParams =
                    req as RequestWithValidatedParams<GetDocumentDetailsParamsType>;
                const { id: documentId } = requestWithParams.validated.params;

                const result = await service.deleteDocument(documentId, {
                    userId,
                    tenantId: activeTenantId,
                });

                if (result.status === 'forbidden') {
                    return res.status(403).json({
                        error: {
                            code: 'DOCUMENT_DELETE_FORBIDDEN',
                            message:
                                'You do not have permission to delete this document.',
                        },
                    });
                }

                if (result.status === 'not_found') {
                    return res.status(404).json({
                        error: {
                            code: 'DOCUMENT_NOT_FOUND',
                            message: 'Document not found.',
                        },
                    });
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
                const { userId } = req.session ?? {};
                const activeTenantId = req.session?.currentTenantId;

                if (!userId) {
                    return res.status(401).json({
                        error: {
                            code: 'UNAUTHORIZED',
                            message: 'Authentication required.',
                        },
                    });
                }

                if (!activeTenantId) {
                    return res.status(400).json({
                        error: {
                            code: 'TENANT_MISSING',
                            message: 'No active tenant selected.',
                        },
                    });
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

                if (result.status === 'forbidden') {
                    return res.status(403).json({
                        error: {
                            code: 'DOCUMENT_UPDATE_FORBIDDEN',
                            message:
                                'You do not have permission to update this document.',
                        },
                    });
                }

                if (result.status === 'not_found') {
                    return res.status(404).json({
                        error: {
                            code: 'DOCUMENT_NOT_FOUND',
                            message: 'Document not found.',
                        },
                    });
                }

                if (result.status === 'invalid') {
                    return res.status(400).json({
                        error: {
                            code: 'INVALID_TITLE',
                            message: 'Title cannot be empty.',
                        },
                    });
                }

                res.status(200).json({ document: result.document });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

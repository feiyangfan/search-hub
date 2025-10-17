import { Router } from 'express';

import {
    CreateDocumentRequest,
    CreateDocumentRequestType,
} from '@search-hub/schemas';

import { validateBody } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from './types.js';
import {
    createDocumentService,
    type DocumentService,
} from '../services/documentService.js';
import {
    GetDocumentDetailsParams,
    type GetDocumentDetailsParamsType,
} from '@search-hub/schemas';
import { validateParams } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedParams } from './types.js';

export function documentRoutes(
    service: DocumentService = createDocumentService()
) {
    const router = Router();

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

    return router;
}

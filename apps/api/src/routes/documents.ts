import { Router } from 'express';
import { type z } from 'zod';

import { CreateDocumentRequest } from '@search-hub/schemas';

import { validateBody } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from './types.js';
import {
    createDocumentService,
    type DocumentService,
} from '../services/documentService.js';

export function documentRoutes(
    service: DocumentService = createDocumentService()
) {
    const router = Router();

    router.post(
        '/',
        validateBody(CreateDocumentRequest),
        async (req, res, next) => {
            try {
                const body = (
                    req as RequestWithValidatedBody<
                        z.infer<typeof CreateDocumentRequest>
                    >
                ).validated.body;

                const { documentId } = await service.createAndQueueDocument(body);

                res.status(202).json({ id: documentId, status: 'queued' }); // 202 accepted since it's async work (queue)
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

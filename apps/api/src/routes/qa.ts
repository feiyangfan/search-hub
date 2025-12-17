import { Router } from 'express';
import { type z } from 'zod';

import { AppError, QaRequest } from '@search-hub/schemas';
import { validateBody } from '../middleware/validateMiddleware.js';
import { type AuthenticatedRequestWithBody } from './types.js';
import { createQaService, type QaService } from '../services/qaService.js';

export function qaRoutes(service: QaService = createQaService()) {
    const router = Router();

    // POST /v1/qa - answer a question using workspace context
    router.post(
        '/',
        validateBody(QaRequest),
        async (req, res, next) => {
            try {
                const authReq =
                    req as AuthenticatedRequestWithBody<
                        z.infer<typeof QaRequest>
                    >;

                const tenantId = authReq.session?.currentTenantId;
                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'qa',
                                operation: 'answer',
                            },
                        }
                    );
                }

                const body =
                    (req as AuthenticatedRequestWithBody<
                        z.infer<typeof QaRequest>
                    >).validated.body;

                const response = await service.answerQuestion({
                    tenantId,
                    ...body,
                });

                res.json(response);
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

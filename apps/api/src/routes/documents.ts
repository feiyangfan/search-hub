import { Router } from 'express';
import { type z } from 'zod';

import {
    CreateDocumentRequest,
    IndexDocumentJobSchema,
    JOBS,
    type IndexDocumentJob,
} from '@search-hub/schemas';
import { db } from '@search-hub/db';

import { validateBody } from '../middleware/validateMiddleware.js';
import { indexQueue } from '../queue.js';
import { logger } from '@search-hub/logger';
import type { RequestWithValidatedBody } from './types.js';

export function documentRoutes() {
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

                // We write the DB row before enqueue.
                // If enqueue fails, the DB shows queued with no Redis job;
                // The runbook has a remediation (re-enqueue).
                // The inverse order is also valid (enqueue then DB),
                // but then a crash between the two creates a “ghost” Redis job with no DB record.
                logger.info('document.create.start');
                const doc = await db.document.create({
                    tenantId: body.tenantId,
                    title: body.title,
                    source: body.source,
                    mimeType: body.mimeType,
                    content: body.content,
                });

                logger.info(
                    {
                        documentId: doc.id,
                    },
                    'document.create.succeeded'
                );

                await db.job.enqueueIndex(body.tenantId, doc.id);

                // Enqueue work to index the document
                // Could do this here in a transaction with the document creation
                const jobPayload: IndexDocumentJob =
                    IndexDocumentJobSchema.parse({
                        tenantId: doc.tenantId,
                        documentId: doc.id,
                    });

                const job = await indexQueue.add(
                    JOBS.INDEX_DOCUMENT,
                    jobPayload,
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                        removeOnComplete: true,
                        removeOnFail: false, // For debugging keep failed jobs in the queue
                    }
                );

                logger.info(
                    {
                        docId: doc.id,
                        jobId: job.id,
                        tenantId: doc.tenantId,
                    },
                    'queue.enqueue.succeeded'
                );

                res.status(202).json({ id: doc.id, status: 'queued' }); // 202 accepted since it's async work (queue)
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

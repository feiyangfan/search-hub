/**
 * Periodic job to reindex stale documents
 * Runs every 30-60 minutes to catch documents that:
 * - Were updated but reindex failed
 * - Were updated while worker was down
 * - Have never been indexed
 */

import type { Queue } from 'bullmq';
import { db } from '@search-hub/db';
import { logger } from '@search-hub/logger';
import { JOBS } from '@search-hub/schemas';
import type { IndexDocumentJob } from '@search-hub/schemas';

/**
 * Queue stale documents for reindexing
 */
export async function syncStaleDocuments(
    indexQueue: Queue<IndexDocumentJob>
): Promise<{
    queued: number;
    errors: number;
}> {
    const startTime = Date.now();
    let queued = 0;
    let errors = 0;

    try {
        logger.info('sync_stale_documents.started');

        const staleDocuments = await db.document.findStaleDocuments(100);

        if (staleDocuments.length === 0) {
            logger.info('sync_stale_documents.no_stale_documents');
            return { queued: 0, errors: 0 };
        }

        logger.info(
            {
                count: staleDocuments.length,
                documents: staleDocuments.map((d) => ({
                    id: d.id,
                    title: d.title,
                    updatedAt: d.updatedAt,
                    lastIndexedAt: d.lastIndexedAt,
                })),
            },
            'sync_stale_documents.found_stale'
        );

        // Queue each stale document for reindexing
        for (const doc of staleDocuments) {
            try {
                // Check if already queued or processing
                const existingJob = await db.job.findByDocumentId(doc.id);
                if (
                    existingJob &&
                    (existingJob.status === 'queued' ||
                        existingJob.status === 'processing')
                ) {
                    logger.info(
                        { documentId: doc.id, jobId: existingJob.id },
                        'sync_stale_documents.already_queued'
                    );
                    continue;
                }

                // Enqueue the document for indexing
                await db.job.enqueueIndex(doc.tenantId, doc.id);

                const jobPayload: IndexDocumentJob = {
                    tenantId: doc.tenantId,
                    documentId: doc.id,
                };

                await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: {
                        age: 86400, // 24 hours
                        count: 1000,
                    },
                    removeOnFail: {
                        age: 604800, // 7 days
                    },
                });

                queued++;

                logger.info(
                    {
                        documentId: doc.id,
                        tenantId: doc.tenantId,
                        title: doc.title,
                    },
                    'sync_stale_documents.queued'
                );
            } catch (error) {
                errors++;
                logger.error(
                    {
                        documentId: doc.id,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    'sync_stale_documents.queue_failed'
                );
            }
        }

        const duration = Date.now() - startTime;
        logger.info(
            {
                queued,
                errors,
                total: staleDocuments.length,
                durationMs: duration,
            },
            'sync_stale_documents.completed'
        );

        return { queued, errors };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
                durationMs: duration,
            },
            'sync_stale_documents.failed'
        );
        throw error;
    }
}

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
                const jobId = `${doc.tenantId}-${doc.id}`;

                // Check if job is already in BullMQ queue
                const bullmqJob = await indexQueue.getJob(jobId);

                if (bullmqJob) {
                    const state = await bullmqJob.getState();

                    // Skip if job is actively queued or running
                    if (
                        state === 'waiting' ||
                        state === 'active' ||
                        state === 'delayed'
                    ) {
                        logger.info(
                            {
                                documentId: doc.id,
                                bullmqJobId: bullmqJob.id,
                                state,
                            },
                            'sync_stale_documents.already_in_bullmq'
                        );
                        continue;
                    }

                    // If completed or failed, remove it so we can re-queue with same jobId
                    if (state === 'completed' || state === 'failed') {
                        await bullmqJob.remove();
                        logger.info(
                            {
                                documentId: doc.id,
                                state,
                                jobId,
                            },
                            'sync_stale_documents.removed_old_job'
                        );
                    }
                }

                // Check DB job status
                const existingJob = await db.job.findByDocumentId(doc.id);

                // Skip if actively processing (worker has picked it up)
                if (existingJob && existingJob.status === 'processing') {
                    logger.info(
                        { documentId: doc.id, jobId: existingJob.id },
                        'sync_stale_documents.already_processing'
                    );
                    continue;
                }

                const jobPayload: IndexDocumentJob = {
                    tenantId: doc.tenantId,
                    documentId: doc.id,
                };

                // Try to add job to BullMQ first (may fail if duplicate)
                try {
                    await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
                        jobId, // Stable job ID (old job removed if existed)
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                        removeOnComplete: true, // Remove immediately to avoid history pollution
                        removeOnFail: false, // Keep failed jobs for debugging
                    });

                    // Only update DB if BullMQ add succeeded
                    await db.job.enqueueIndex(doc.tenantId, doc.id);
                } catch (error) {
                    // If BullMQ rejects (e.g., duplicate jobId), it's already queued
                    if (
                        error instanceof Error &&
                        error.message.includes('job with id')
                    ) {
                        logger.info(
                            { documentId: doc.id, tenantId: doc.tenantId },
                            'sync_stale_documents.duplicate_jobid_skipped'
                        );
                        continue;
                    }
                    throw error; // Re-throw other errors
                }

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

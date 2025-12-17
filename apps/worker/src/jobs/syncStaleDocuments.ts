/**
 * Periodic job to reindex stale documents
 * Runs every 30 minutes to catch documents that:
 * - Were updated but reindex failed
 * - Were updated while worker was down
 * - Have never been indexed
 */

import type { Job, Queue } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';
import {
    JOBS,
    SyncStaleDocumentsJobSchema,
    type SyncStaleDocumentsJob,
    type IndexDocumentJob,
} from '@search-hub/schemas';

/**
 * Process sync stale documents job
 * Scans for stale documents and queues them for reindexing
 */
export async function syncStaleDocuments(
    job: Job<SyncStaleDocumentsJob>,
    indexQueue: Queue<IndexDocumentJob>
): Promise<{
    queued: number;
    errors: number;
}> {
    // Validate job data
    SyncStaleDocumentsJobSchema.parse(job.data);

    const startTime = Date.now();
    let queued = 0;
    let errors = 0;

    // Create job-scoped logger with context
    const logger = baseLogger.child({
        component: 'sync-stale-documents-job',
        jobId: job.id,
        attempt: job.attemptsMade + 1,
    });

    try {
        const staleDocuments = await db.document.findStaleDocuments(100);

        if (staleDocuments.length === 0) {
            logger.info('sync.skipped.no_stale_documents');
            return { queued: 0, errors: 0 };
        }

        logger.info(
            { count: staleDocuments.length },
            'sync.found_stale_documents'
        );

        // Queue each stale document for reindexing
        for (const doc of staleDocuments) {
            try {
                // Check if job is already in BullMQ queue (use dynamic jobId to allow multiple jobs)
                const jobId = `${doc.tenantId}-${doc.id}-${Date.now()}`;
                const existingJobs = await indexQueue.getJobs([
                    'waiting',
                    'active',
                    'delayed',
                ]);

                // Check if this document already has a job queued
                const hasQueuedJob = existingJobs.some(
                    (j) =>
                        j.data.tenantId === doc.tenantId &&
                        j.data.documentId === doc.id
                );

                if (hasQueuedJob) {
                    logger.debug(
                        {
                            documentId: doc.id,
                            tenantId: doc.tenantId,
                        },
                        'sync.skipped.already_queued'
                    );
                    continue;
                }

                const jobPayload: IndexDocumentJob = {
                    tenantId: doc.tenantId,
                    documentId: doc.id,
                    reindex: true,
                };

                // Add job to BullMQ with unique jobId (allows multiple jobs per document over time)
                await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
                    jobId, // Unique job ID per execution
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: true,
                    removeOnFail: false,
                });

                // Create new IndexJob record in DB for audit trail
                await db.job.enqueueIndex(doc.tenantId, doc.id);

                queued++;
            } catch (error) {
                errors++;
                logger.error(
                    {
                        documentId: doc.id,
                        tenantId: doc.tenantId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                    'sync.document_queue_failed'
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
            'sync.completed'
        );

        return { queued, errors };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
                durationMs: duration,
            },
            'sync.failed'
        );
        throw error;
    }
}

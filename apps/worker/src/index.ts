import { Worker, QueueEvents, JobsOptions } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as base } from '@search-hub/logger';
const logger = base.child({
    service: 'worker',
});
import {
    JOBS,
    IndexDocumentJobSchema,
    type IndexDocumentJob,
} from '@search-hub/schemas';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 5);

const connection = { url: REDIS_URL };

// Optional: listen to queue-level events for observability
const queueEvents = new QueueEvents(JOBS.INDEX_DOCUMENT, { connection });
queueEvents.on('completed', ({ jobId }) =>
    logger.info({ jobId }, 'Index job completed')
);
queueEvents.on('failed', ({ jobId, failedReason }) =>
    logger.error({ jobId, failedReason }, 'Index job failed')
);

// Processor function: does the actual work
const processor = async (job: { data: IndexDocumentJob }) => {
    // 1) Validate payload
    const { tenantId, documentId } = IndexDocumentJobSchema.parse(job.data);

    // 2) Transition: queued -> processing
    const start = await db.job.startProcessing(tenantId, documentId);

    if (start === 0) {
        // No matching queued job. Could be a duplicate/retry or manual replay.
        logger.warn(
            { tenantId, documentId },
            'No queued job found to move to processing; continuing'
        );
    }

    try {
        // 3) Simulate indexing work
        // Replace with pipeline later
        await new Promise((r) => setTimeout(r, 500));
        logger.debug(`${tenantId}-${documentId} indexing (simulated)`);

        // Replace the document title so the API reflects the simulated work
        const doc = await db.document.getById(documentId);
        if (!doc) {
            throw new Error(
                `Document ${documentId} not found for tenant ${tenantId}`
            );
        }
        const indexedTitle = doc.title.endsWith(' - indexed')
            ? doc.title
            : `${doc.title} - indexed`;
        if (indexedTitle !== doc.title) {
            await db.document.updateTitle(doc.id, indexedTitle);
        }

        // 4) Transition: processing -> indexed
        const done = await db.job.markIndexed(tenantId, documentId);
        logger.debug(`${tenantId}-${documentId} indexed (simulated)`);

        if (done === 0) {
            logger.warn(
                { tenantId, documentId },
                'No processing job found to mark indexed (was it already updated?)'
            );
        }

        // You could return metadata for logging/metrics
        return { ok: true, tenantId, documentId };
    } catch (err: any) {
        // 5) Mark failed in DB and rethrow so BullMQ can retry
        await db.job.markFailed(tenantId, documentId, err?.message ?? err);
        logger.error(
            { tenantId, documentId, err },
            'Index job failed; marked as failed in DB'
        );
        throw err; // lets BullMQ apply attempts/backoff
    }
};

const worker = new Worker<IndexDocumentJob>(JOBS.INDEX_DOCUMENT, processor, {
    connection,
    concurrency: WORKER_CONCURRENCY,
});

worker.on('ready', () => logger.info('Worker started'));
worker.on('error', (err) => logger.error({ err }, 'Worker fatal error'));
worker.on('failed', (job, err) =>
    logger.debug(
        { jobId: job?.id, err },
        'Processor failed (will retry if attempts remain)'
    )
);

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    await queueEvents.close();
    process.exit(0);
});

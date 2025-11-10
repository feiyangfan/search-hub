import { Worker, QueueEvents, Job } from 'bullmq';
import { db, prisma } from '@search-hub/db';
import { logger as base } from '@search-hub/logger';
import { chunkText, sha256 } from '@search-hub/schemas';
import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv, loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';
import {
    JOBS,
    IndexDocumentJobSchema,
    type IndexDocumentJob,
    SendReminderJobSchema,
    type SendReminderJob,
} from '@search-hub/schemas';

const VOYAGE_API_KEY = loadAiEnv().VOYAGE_API_KEY;
const env = loadWorkerEnv();

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

type TextChunk = ReturnType<typeof chunkText>[number];

const logger = base.child({
    service: 'worker',
});

const REDIS_URL = env.REDIS_URL ?? 'redis://localhost:6379';
const WORKER_CONCURRENCY = Number(env.WORKER_CONCURRENCY ?? 5);
const MAX_CHUNK_LIMIT = Number(env.WORKER_MAX_CHUNK_LIMIT ?? 5000);

const connection = { url: REDIS_URL };

// Optional: listen to queue-level events for observability
const queueEvents = new QueueEvents(JOBS.INDEX_DOCUMENT, { connection });

queueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Index job completed');

    // Decrease queue depth (job finished processing)
    metrics.queueDepth.dec({
        queue_name: JOBS.INDEX_DOCUMENT,
        tenant_id: 'all',
    });

    // Track successful job completion
    metrics.jobsProcessed.inc({
        job_type: 'index_document',
        result: 'success',
    });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Index job failed');

    // Decrease queue depth (job finished, even though it failed)
    metrics.queueDepth.dec({
        queue_name: JOBS.INDEX_DOCUMENT,
        tenant_id: 'all',
    });

    // Track failed job
    metrics.jobsProcessed.inc({
        job_type: 'index_document',
        result: 'failure',
    });
    metrics.jobsFailed.inc({
        job_type: 'index_document',
        error_code: 'processing_error',
    });
});

// Processor function: does the actual work
type ProcessorResult =
    | { ok: true; reason: 'empty-content' | 'already-indexed' | 'no-chunks' }
    | { ok: true; documentId: string; chunks: number };

const processor = async (
    job: Job<IndexDocumentJob>
): Promise<ProcessorResult> => {
    // Start timing the job
    const startTime = Date.now();

    // 1) Validate payload
    const { tenantId, documentId } = IndexDocumentJobSchema.parse(job.data);

    logger.info('processor started');

    // Track active job (job is now being processed)
    metrics.activeJobs.inc({ job_type: 'index_document', tenant_id: tenantId });

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
        // 3) indexing work
        logger.debug(`${documentId} indexing (simulated)`);

        // Fetch the document content
        const doc = await db.document.findUnique(documentId);
        if (!doc) {
            throw new Error(
                `Document ${documentId} not found for tenant ${tenantId}`
            );
        }

        const text = (doc.content ?? '').trim();
        logger.info(
            {
                tenantId,
                documentId,
                textLength: text.length,
            },
            'content.loaded'
        );
        if (!text) {
            // No content to index; mark done for now.
            await db.job.markIndexed(tenantId, documentId);
            logger.info(
                { docId: doc.id, docTitle: doc.title },
                'empty content'
            );
            return { ok: true, reason: 'empty-content' };
        }

        // idempotency
        const checksum = sha256(text);
        const prev = await db.documentIndexState.findUnique(documentId);
        if (prev?.lastChecksum === checksum) {
            await db.job.markIndexed(tenantId, documentId);
            logger.info(
                { docId: doc.id, docTitle: doc.title },
                'already indexed'
            );
            return { ok: true, reason: 'already-indexed' };
        }

        logger.info('chunking.started');

        // Chunk the text for embedding
        const chunks = chunkText(text, 1000, 100); // 1k chars with 100 overlap
        if (chunks.length === 0) {
            await db.job.markIndexed(tenantId, documentId);
            logger.info({ docId: doc.id, docTitle: doc.title }, 'no chunks');
            return { ok: true, reason: 'no-chunks' };
        }

        const chunkCount = chunks.length;
        logger.info(
            {
                tenantId,
                documentId,
                chunkCount,
            },
            'chunking.complete'
        );

        if (chunkCount > MAX_CHUNK_LIMIT) {
            logger.error(
                {
                    tenantId,
                    documentId,
                    chunkCount,
                    maxChunkLimit: MAX_CHUNK_LIMIT,
                },
                'chunk.limit.exceeded'
            );
            throw new Error(
                `Chunk count ${chunkCount} exceeds limit ${MAX_CHUNK_LIMIT}`
            );
        }

        // Track AI request duration for embeddings
        const startEmbedding = Date.now();
        const vectors = await voyage.embed(
            chunks.map((c: TextChunk) => c.text),
            {
                input_type: 'document',
            }
        );
        metrics.aiRequestDuration.observe(
            { provider: 'voyage', operation: 'embed' },
            (Date.now() - startEmbedding) / 1000
        );

        logger.info(
            {
                tenantId,
                documentId,
                vectorCount: vectors.length,
            },
            'embedding.complete'
        );

        await db.document.replaceChunksWithEmbeddings({
            tenantId,
            documentId,
            chunks,
            vectors,
            checksum,
        });

        // Replace the document title so the API reflects the work for debug purpose
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

        // Track successful job duration
        const duration = (Date.now() - startTime) / 1000;
        metrics.jobDuration.observe(
            {
                job_type: 'index_document',
                tenant_id: tenantId,
                result: 'success',
            },
            duration
        );

        // You could return metadata for logging/metrics
        return { ok: true, documentId, chunks: chunks.length };
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        // 5) Mark failed in DB and rethrow so BullMQ can retry
        await db.job.markFailed(tenantId, documentId, error.message);
        logger.error(
            { err: error, jobId: job.id, data: job.data },
            'Index job failed; marked as failed in DB'
        );

        // Track failed job duration
        const duration = (Date.now() - startTime) / 1000;
        metrics.jobDuration.observe(
            {
                job_type: 'index_document',
                tenant_id: tenantId,
                result: 'failure',
            },
            duration
        );

        throw error;
    } finally {
        // Always decrement active jobs counter (whether success or failure)
        metrics.activeJobs.dec({
            job_type: 'index_document',
            tenant_id: tenantId,
        });
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

// ===== Reminder Worker =====
const reminderProcessor = async (job: Job<SendReminderJob>) => {
    const { tenantId, documentCommandId } = SendReminderJobSchema.parse(
        job.data
    );

    logger.info(
        { documentCommandId, tenantId },
        'Processing reminder notification'
    );

    try {
        // Fetch the reminder command
        const command = await prisma.documentCommand.findUnique({
            where: { id: documentCommandId },
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!command) {
            logger.warn(
                { documentCommandId },
                'DocumentCommand not found, may have been deleted'
            );
            return { ok: true, reason: 'not-found' };
        }

        const body = command.body as {
            kind: string;
            status?: string;
            whenText?: string;
            whenISO?: string;
        };
        const currentStatus = body?.status;

        // Only notify if still scheduled (not already done/snoozed)
        if (currentStatus !== 'scheduled') {
            logger.info(
                { documentCommandId, status: currentStatus },
                'Reminder already processed or cancelled'
            );
            return { ok: true, reason: 'already-processed' };
        }

        // Update status to 'notified'
        await prisma.documentCommand.update({
            where: { id: documentCommandId },
            data: {
                body: {
                    ...body,
                    status: 'notified',
                    notifiedAt: new Date().toISOString(),
                },
            },
        });

        logger.info(
            {
                documentCommandId,
                userId: command.userId,
                documentId: command.documentId,
                whenText: body?.whenText,
            },
            'Reminder notification sent'
        );

        return { ok: true, documentCommandId };
    } catch (error) {
        logger.error(
            { error, documentCommandId, tenantId },
            'Failed to process reminder'
        );
        throw error;
    }
};

const reminderQueueEvents = new QueueEvents(JOBS.SEND_REMINDER, {
    connection,
});

reminderQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Reminder job completed');
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'success',
    });
});

reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Reminder job failed');
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'failure',
    });
});

const reminderWorker = new Worker<SendReminderJob>(
    JOBS.SEND_REMINDER,
    reminderProcessor,
    {
        connection,
        concurrency: 5, // Process up to 5 reminders concurrently
    }
);

reminderWorker.on('ready', () => logger.info('Reminder worker started'));
reminderWorker.on('error', (err) =>
    logger.error({ err }, 'Reminder worker error')
);

// Graceful shutdown
const handleSigint = async () => {
    logger.info('Shutting down workers...');
    await worker.close();
    await reminderWorker.close();
    await queueEvents.close();
    await reminderQueueEvents.close();
    process.exit(0);
};

process.on('SIGINT', () => {
    void handleSigint();
});

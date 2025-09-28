import { Worker, QueueEvents, Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as base } from '@search-hub/logger';
import { chunkText, sha256 } from '@search-hub/schemas';
import { voyageEmbed } from '@search-hub/ai';
import { loadWorkerEnv } from '@search-hub/config-env';
import {
    JOBS,
    IndexDocumentJobSchema,
    type IndexDocumentJob,
} from '@search-hub/schemas';

const env = loadWorkerEnv();

type TextChunk = ReturnType<typeof chunkText>[number];

const logger = base.child({
    service: 'worker',
});

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 5);
const MAX_CHUNK_LIMIT = Number(process.env.WORKER_MAX_CHUNK_LIMIT ?? 5000);

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
const processor = async (job: Job<IndexDocumentJob>) => {
    // 1) Validate payload
    const { tenantId, documentId } = IndexDocumentJobSchema.parse(job.data);

    logger.info('processor started');

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

        const vectors = await voyageEmbed(
            chunks.map((c: TextChunk) => c.text),
            {
                input_type: 'document',
            }
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

        // You could return metadata for logging/metrics
        return { ok: true, documentId, chunks: chunks.length };
    } catch (err: any) {
        // 5) Mark failed in DB and rethrow so BullMQ can retry
        await db.job.markFailed(tenantId, documentId, err?.message ?? err);
        logger.error(
            { err, jobId: job.id, data: job.data },
            'Index job failed; marked as failed in DB'
        );
        throw err;
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

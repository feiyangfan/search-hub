/**
 * Job processor for indexing documents
 * Chunks text, generates embeddings, and stores them in the database
 */

import type { Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '@search-hub/logger';
import { chunkText, sha256, IndexDocumentJobSchema } from '@search-hub/schemas';
import type { IndexDocumentJob } from '@search-hub/schemas';
import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv, loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import stripMarkdown from 'strip-markdown';

const VOYAGE_API_KEY = loadAiEnv().VOYAGE_API_KEY;
const env = loadWorkerEnv();
const MAX_CHUNK_LIMIT = Number(env.WORKER_MAX_CHUNK_LIMIT ?? 5000);

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });
const logger = baseLogger.child({
    service: 'worker',
    processor: 'index-document',
});

type TextChunk = ReturnType<typeof chunkText>[number];

export type ProcessorResult =
    | { ok: true; reason: 'empty-content' | 'already-indexed' | 'no-chunks' }
    | { ok: true; documentId: string; chunks: number };

function cleanMarkdown(source: string): string {
    try {
        const file = unified()
            .use(remarkParse)
            .use(stripMarkdown)
            .use(remarkStringify)
            .processSync(source);
        return String(file.value).replace(/\s+/g, ' ').trim();
    } catch (error) {
        logger.warn(
            { error: error instanceof Error ? error.message : String(error) },
            'markdown.cleaning_failed_fallback'
        );
        return source.replace(/\s+/g, ' ').trim();
    }
}

/**
 * Process an index document job
 * - Fetches document content
 * - Chunks the text
 * - Generates embeddings via Voyage AI
 * - Stores chunks and embeddings in database
 */
export async function processIndexDocument(
    job: Job<IndexDocumentJob>
): Promise<ProcessorResult> {
    const startTime = Date.now();

    // 1) Validate payload
    const {
        tenantId,
        documentId,
        reindex = false,
    } = IndexDocumentJobSchema.parse(job.data);

    logger.info({ tenantId, documentId, jobId: job.id }, 'processor.started');

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
        // 3) Fetch the document content
        const doc = await db.document.findUnique(documentId);
        if (!doc) {
            throw new Error(
                `Document ${documentId} not found for tenant ${tenantId}`
            );
        }

        const rawText = (doc.content ?? '').trim();
        const cleanedText = cleanMarkdown(rawText);
        logger.info(
            {
                tenantId,
                documentId,
                textLength: rawText.length,
                cleanedLength: cleanedText.length,
            },
            'content.loaded'
        );

        if (!cleanedText) {
            // No content to index; mark job done but DON'T update DocumentIndexState
            // findStaleDocuments won't requeue because document has no content
            await db.job.markIndexed(tenantId, documentId);
            logger.info(
                { documentId, title: doc.title },
                'empty.content.skipped'
            );
            return { ok: true, reason: 'empty-content' };
        }

        // 4) Idempotency check - skip if content hasn't changed (unless reindex)
        const checksum = sha256(cleanedText);
        const prev = await db.documentIndexState.findUnique(documentId);
        if (!reindex && prev?.lastChecksum === checksum) {
            // Content unchanged, but update lastIndexedAt to reflect we checked it
            // This prevents re-queueing even though we skip actual indexing
            await db.documentIndexState.upsert(
                documentId,
                checksum,
                new Date()
            );
            await db.job.markIndexed(tenantId, documentId);
            logger.info(
                { documentId, title: doc.title, checksum },
                'already.indexed.skipped'
            );
            return { ok: true, reason: 'already-indexed' };
        }

        logger.info({ documentId }, 'chunking.started');

        // 6) Chunk the text for embedding
        const chunks = chunkText(cleanedText, 1000, 100); // 1k chars with 100 overlap
        if (chunks.length === 0) {
            // Edge case: has content but produces no chunks (very short text)
            // Update index state so we don't keep retrying
            await db.documentIndexState.upsert(
                documentId,
                checksum,
                new Date()
            );
            await db.job.markIndexed(tenantId, documentId);
            logger.info({ documentId, title: doc.title }, 'no.chunks.skipped');
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

        // 7) Generate embeddings via Voyage AI
        logger.info({ documentId, chunkCount }, 'embedding.started');
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

        // 8) Store chunks and embeddings in database
        await db.document.replaceChunksWithEmbeddings({
            tenantId,
            documentId,
            chunks,
            vectors,
            checksum,
        });

        // 9) Transition: processing -> indexed
        const done = await db.job.markIndexed(tenantId, documentId);

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

        logger.info(
            { documentId, chunks: chunks.length, durationMs: duration * 1000 },
            'processor.success'
        );

        return { ok: true, documentId, chunks: chunks.length };
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Mark failed in DB and rethrow so BullMQ can retry
        await db.job.markFailed(tenantId, documentId, error.message);
        logger.error(
            { err: error, jobId: job.id, tenantId, documentId },
            'processor.failed'
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
}

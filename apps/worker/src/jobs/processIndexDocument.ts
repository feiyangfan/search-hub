/**
 * Job processor for indexing documents
 * Chunks text, generates embeddings, and stores them in the database
 */

import type { Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';
import { sha256, IndexDocumentJobSchema } from '@search-hub/schemas';
import type { IndexDocumentJob } from '@search-hub/schemas';
import { createVoyageHelpers, chunkMarkdown } from '@search-hub/ai';
import { loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';

const env = loadWorkerEnv();
const VOYAGE_API_KEY = env.VOYAGE_API_KEY;
const MAX_CHUNK_LIMIT = Number(env.WORKER_MAX_CHUNK_LIMIT ?? 5000);

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

export type ProcessorResult =
    | { ok: true; reason: 'empty-content' | 'already-indexed' | 'no-chunks' }
    | { ok: true; documentId: string; chunks: number };

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

    // Create job-scoped logger with context
    const logger = baseLogger.child({
        component: 'index-document-job',
        jobId: job.id,
        tenantId,
        documentId,
        attempt: job.attemptsMade + 1,
    });

    // Track active job (job is now being processed)
    metrics.activeJobs.inc({ job_type: 'index_document', tenant_id: tenantId });

    // 2) Transition: queued -> processing
    await db.job.startProcessing(tenantId, documentId);

    try {
        // 3) Fetch the document content
        const doc = await db.document.findUnique(documentId);
        if (!doc) {
            throw new Error(
                `Document ${documentId} not found for tenant ${tenantId}`
            );
        }

        const rawMarkdown = (doc.content ?? '').trim();

        if (!rawMarkdown) {
            // No content to index; mark job done but DON'T update DocumentIndexState
            // findStaleDocuments won't requeue because document has no content
            await db.job.markIndexed(tenantId, documentId);
            logger.info({ title: doc.title }, 'job.skipped.empty_content');
            return { ok: true, reason: 'empty-content' };
        }

        // 4) Idempotency check - skip if content hasn't changed (unless reindex)
        const checksum = sha256(rawMarkdown);
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
                { title: doc.title, checksum },
                'job.skipped.already_indexed'
            );
            return { ok: true, reason: 'already-indexed' };
        }

        // 5) Chunk markdown while preserving structure
        const markdownChunks = chunkMarkdown(rawMarkdown, {
            chunkSize: 2000,
            overlapBlocks: 1, // Include 1 previous section for context
        });

        // Filter out chunks with empty searchText (Voyage AI rejects empty strings)
        const validChunks = markdownChunks.filter(
            (chunk) => chunk.searchText.trim().length > 0
        );

        if (validChunks.length === 0) {
            // Edge case: has content but produces no chunks (very short text)
            // Update index state so we don't keep retrying
            await db.documentIndexState.upsert(
                documentId,
                checksum,
                new Date()
            );
            await db.job.markIndexed(tenantId, documentId);
            logger.info({ title: doc.title }, 'job.skipped.no_chunks');
            return { ok: true, reason: 'no-chunks' };
        }

        const chunkCount = validChunks.length;

        if (chunkCount > MAX_CHUNK_LIMIT) {
            logger.error(
                {
                    chunkCount,
                    maxChunkLimit: MAX_CHUNK_LIMIT,
                },
                'job.failed.chunk_limit_exceeded'
            );
            throw new Error(
                `Chunk count ${chunkCount} exceeds limit ${MAX_CHUNK_LIMIT}`
            );
        }

        logger.debug(
            {
                totalChunks: markdownChunks.length,
                validChunks: validChunks.length,
                filteredOut: markdownChunks.length - validChunks.length,
            },
            'chunking.completed'
        );

        // 6) Generate embeddings via Voyage AI (use cleaned search text)
        const startEmbedding = Date.now();
        const vectors = await voyage.embed(
            validChunks.map((c) => c.searchText),
            {
                input_type: 'document',
            }
        );
        metrics.aiRequestDuration.observe(
            { provider: 'voyage', operation: 'embed' },
            (Date.now() - startEmbedding) / 1000
        );

        // 7) Store chunks and embeddings in database
        const chunks = validChunks.map((mc) => ({
            idx: mc.idx,
            text: mc.searchText, // cleaned text for embeddings/search
            rawMarkdown: mc.rawMarkdown, // original markdown for display
            headingPath: mc.headingPath,
            startPos: mc.startPos,
            endPos: mc.endPos,
        }));

        await db.document.replaceChunksWithEmbeddings({
            tenantId,
            documentId,
            chunks,
            vectors,
            checksum,
        });

        // 8) Transition: processing -> indexed
        await db.job.markIndexed(tenantId, documentId);

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
            {
                chunks: validChunks.length,
                durationMs: Math.round(duration * 1000),
                headingsFound: validChunks.filter(
                    (c) => c.headingPath.length > 0
                ).length,
            },
            'job.completed'
        );

        return { ok: true, documentId, chunks: validChunks.length };
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Mark failed in DB and rethrow so BullMQ can retry
        await db.job.markFailed(tenantId, documentId, error.message);
        logger.error({ error: error.message }, 'job.failed');

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

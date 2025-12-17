/**
 * Job processor for indexing documents
 * Chunks text, generates embeddings, and stores them in the database
 */

import type { Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';
import { chunkText, sha256, IndexDocumentJobSchema } from '@search-hub/schemas';
import type { IndexDocumentJob } from '@search-hub/schemas';
import { createVoyageHelpers } from '@search-hub/ai';
import { loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import stripMarkdown from 'strip-markdown';

const env = loadWorkerEnv();
const VOYAGE_API_KEY = env.VOYAGE_API_KEY;
const MAX_CHUNK_LIMIT = Number(env.WORKER_MAX_CHUNK_LIMIT ?? 5000);

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

type TextChunk = ReturnType<typeof chunkText>[number];

export type ProcessorResult =
    | { ok: true; reason: 'empty-content' | 'already-indexed' | 'no-chunks' }
    | { ok: true; documentId: string; chunks: number };

function cleanMarkdown(source: string): {
    text: string;
    cleaningFailed: boolean;
} {
    try {
        const file = unified()
            .use(remarkParse)
            .use(stripMarkdown)
            .use(remarkStringify)
            .processSync(source);
        return {
            text: String(file.value).replace(/\s+/g, ' ').trim(),
            cleaningFailed: false,
        };
    } catch (error) {
        // Fallback: return raw text with basic normalization
        console.warn('Markdown cleaning failed, using fallback', { error });
        return {
            text: source.replace(/\s+/g, ' ').trim(),
            cleaningFailed: true,
        };
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

        const rawText = (doc.content ?? '').trim();
        const { text: cleanedText, cleaningFailed } = cleanMarkdown(rawText);

        if (cleaningFailed) {
            logger.warn(
                { textLength: rawText.length },
                'markdown.cleaning.fallback'
            );
        }

        if (!cleanedText) {
            // No content to index; mark job done but DON'T update DocumentIndexState
            // findStaleDocuments won't requeue because document has no content
            await db.job.markIndexed(tenantId, documentId);
            logger.info({ title: doc.title }, 'job.skipped.empty_content');
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
                { title: doc.title, checksum },
                'job.skipped.already_indexed'
            );
            return { ok: true, reason: 'already-indexed' };
        }

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
            logger.info({ title: doc.title }, 'job.skipped.no_chunks');
            return { ok: true, reason: 'no-chunks' };
        }

        const chunkCount = chunks.length;

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

        // 7) Generate embeddings via Voyage AI
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

        // 8) Store chunks and embeddings in database
        await db.document.replaceChunksWithEmbeddings({
            tenantId,
            documentId,
            chunks,
            vectors,
            checksum,
        });

        // 9) Transition: processing -> indexed
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
            { chunks: chunks.length, durationMs: Math.round(duration * 1000) },
            'job.completed'
        );

        return { ok: true, documentId, chunks: chunks.length };
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

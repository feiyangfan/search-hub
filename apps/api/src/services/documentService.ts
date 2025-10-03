import { db as defaultDb } from '@search-hub/db';
import {
    CreateDocumentRequest,
    IndexDocumentJobSchema,
    JOBS,
    type IndexDocumentJob,
} from '@search-hub/schemas';
import { indexQueue as defaultIndexQueue } from '../queue.js';
import { logger as defaultLogger } from '@search-hub/logger';
import type { Logger } from 'pino';
import type { z } from 'zod';

const DEFAULT_QUEUE_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs for debugging
};

export interface DocumentServiceDependencies {
    db?: typeof defaultDb;
    indexQueue?: typeof defaultIndexQueue;
    logger?: Logger;
}

export interface DocumentService {
    createAndQueueDocument(
        body: z.infer<typeof CreateDocumentRequest>
    ): Promise<{ documentId: string; jobId: string; tenantId: string }>; // maybe extend later
}

export function createDocumentService(
    deps: DocumentServiceDependencies = {}
): DocumentService {
    const db = deps.db ?? defaultDb;
    const indexQueue = deps.indexQueue ?? defaultIndexQueue;
    const logger = deps.logger ?? defaultLogger;

    async function createAndQueueDocument(
        body: z.infer<typeof CreateDocumentRequest>
    ): Promise<{ documentId: string; jobId: string; tenantId: string }> {
        logger.info('document.create.start');

        // Create DB record before enqueue so we can remediate mismatched jobs later.
        const doc = await db.document.create({
            tenantId: body.tenantId,
            title: body.title,
            source: body.source,
            mimeType: body.mimeType,
            content: body.content,
        });

        logger.info({ documentId: doc.id }, 'document.create.succeeded');

        await db.job.enqueueIndex(body.tenantId, doc.id);

        const jobPayload: IndexDocumentJob = IndexDocumentJobSchema.parse({
            tenantId: doc.tenantId,
            documentId: doc.id,
        });

        const job = await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
            ...DEFAULT_QUEUE_OPTIONS,
        });

        logger.info(
            {
                documentId: doc.id,
                jobId: job.id,
                tenantId: doc.tenantId,
            },
            'queue.enqueue.succeeded'
        );

        return { documentId: doc.id, jobId: String(job.id), tenantId: doc.tenantId };
    }

    return {
        createAndQueueDocument,
    };
}

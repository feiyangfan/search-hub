import { db as defaultDb } from '@search-hub/db';
import {
    CreateDocumentRequestType,
    IndexDocumentJobSchema,
    JOBS,
    type IndexDocumentJob,
    type DeleteDocumentResponseType,
} from '@search-hub/schemas';
import { indexQueue as defaultIndexQueue } from '../queue.js';
import { logger as defaultLogger } from '@search-hub/logger';
import type { Logger } from 'pino';

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
        body: CreateDocumentRequestType,
        context: { userId: string; tenantId: string }
    ): Promise<{ documentId: string; jobId: string; tenantId: string }>;

    getDocumentDetails(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<DocumentDetails | null>;

    deleteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<DeleteDocumentResponseType>;
}

interface DocumentDetails {
    id: string;
    title: string;
    tenantId: string;
    content: string | null;
    source: string;
    sourceUrl: string | null;
    metadata: unknown;
    createdById: string;
    updatedById: string;
    createdAt: Date;
    updatedAt: Date;
    isFavorite: boolean;
    commands: {
        id: string;
        body: unknown;
        createdAt: Date;
        userId: string;
    }[];
}

export function createDocumentService(
    deps: DocumentServiceDependencies = {}
): DocumentService {
    const db = deps.db ?? defaultDb;
    const indexQueue = deps.indexQueue ?? defaultIndexQueue;
    const logger = deps.logger ?? defaultLogger;

    async function createAndQueueDocument(
        body: CreateDocumentRequestType,
        context: { userId: string; tenantId: string }
    ): Promise<{ documentId: string; jobId: string; tenantId: string }> {
        logger.info('document.create.start');
        const title = body.title?.trim() || 'Untitled document';

        const doc = await db.document.create({
            tenantId: context.tenantId,
            title,
            source: body.source ?? 'editor',
            sourceUrl: body.sourceUrl,
            content: body.content,
            metadata: body.metadata,
            createdById: context.userId,
            updatedById: context.userId,
        });

        logger.info({ documentId: doc.id }, 'document.create.succeeded');

        await db.job.enqueueIndex(context.tenantId, doc.id);

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

        return {
            documentId: doc.id,
            jobId: String(job.id),
            tenantId: doc.tenantId,
        };
    }

    async function getDocumentDetails(
        documentId: string,
        context: { userId: string; tenantId: string }
    ) {
        const doc = await db.document.getById({
            documentId,
            userId: context.userId,
            tenantId: context.tenantId,
        });

        if (!doc) {
            return null;
        }

        const isFavorite =
            Array.isArray(doc.favorites) && doc.favorites.length > 0;

        return {
            id: doc.id,
            title: doc.title,
            tenantId: doc.tenantId,
            content: doc.content,
            source: doc.source,
            sourceUrl: doc.sourceUrl,
            metadata: doc.metadata,
            createdById: doc.createdById,
            updatedById: doc.updatedById,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            isFavorite: isFavorite,
            commands: doc.commands.map((command) => ({
                id: command.id,
                body: command.body,
                createdAt: command.createdAt,
                userId: command.userId,
            })),
        };
    }

    async function deleteDocument(
        documentId: string,
        context: { userId: string; tenantId: string }
    ): Promise<DeleteDocumentResponseType> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            return { status: 'forbidden' };
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            return { status: 'not_found' };
        }

        await db.document.deleteById({
            documentId,
            tenantId: context.tenantId,
        });

        return { status: 'success' };
    }

    return {
        createAndQueueDocument,
        getDocumentDetails,
        deleteDocument,
    };
}

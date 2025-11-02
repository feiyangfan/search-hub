import { db as defaultDb } from '@search-hub/db';
import {
    CreateDocumentRequestType,
    IndexDocumentJobSchema,
    JOBS,
    type DocumentDetailsType,
    type IndexDocumentJob,
    type UpdateDocumentTitlePayloadType,
    type DocumentListResultType,
    type UpdateDocumentContentResultType,
    type UpdateDocumentTitleResultType,
    type DeleteDocumentResultType,
    type ReindexDocumentResultType,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';
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
    ): Promise<DocumentDetailsType | null>;

    deleteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<DeleteDocumentResultType>;

    getDocumentList(context: {
        tenantId: string;
        userId: string;
        limit?: number;
        offset?: number;
        favoritesOnly?: boolean;
    }): Promise<DocumentListResultType>;

    updateDocumentTitle(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: UpdateDocumentTitlePayloadType
    ): Promise<UpdateDocumentTitleResultType>;

    updateDocumentContent(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { content: string }
    ): Promise<UpdateDocumentContentResultType>;

    queueDocumentReindexing(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<ReindexDocumentResultType>;
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

        // Increment queue depth when job is added
        metrics.queueDepth.inc({
            queue_name: JOBS.INDEX_DOCUMENT,
            tenant_id: doc.tenantId,
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
            source: doc.source as 'editor' | 'url',
            sourceUrl: doc.sourceUrl,
            metadata:
                typeof doc.metadata === 'object' &&
                doc.metadata !== null &&
                !Array.isArray(doc.metadata)
                    ? doc.metadata
                    : {},
            createdById: doc.createdById,
            updatedById: doc.updatedById,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            isFavorite: isFavorite,
            commands: doc.commands.map((command) => ({
                id: command.id,
                body: command.body,
                createdAt: command.createdAt.toISOString(),
                userId: command.userId,
            })),
        };
    }

    async function getDocumentList({
        tenantId,
        userId,
        limit,
        offset,
        favoritesOnly,
    }: {
        tenantId: string;
        userId: string;
        limit?: number;
        offset?: number;
        favoritesOnly?: boolean;
    }): Promise<DocumentListResultType> {
        const { items, total } = await db.document.listTenantDocuments({
            tenantId,
            userId,
            limit,
            offset,
            favoritesOnly,
        });
        return {
            items: items.map((item) => ({
                ...item,
                updatedAt: item.updatedAt.toISOString(),
            })),
            total,
        };
    }

    async function deleteDocument(
        documentId: string,
        context: { userId: string; tenantId: string }
    ): Promise<DeleteDocumentResultType> {
        logger.info(
            { documentId, userId: context.userId, tenantId: context.tenantId },
            'document.delete.start'
        );

        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        // Only owners/admins can delete (members are read+write only)
        if (!membership || membership.role === 'member') {
            logger.warn(
                {
                    documentId,
                    userId: context.userId,
                    tenantId: context.tenantId,
                    role: membership?.role,
                },
                'document.delete.forbidden'
            );
            return { success: false, error: 'forbidden' };
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            logger.warn(
                { documentId, tenantId: context.tenantId },
                'document.delete.not_found'
            );
            return { success: false, error: 'not_found' };
        }

        await db.document.deleteById({
            documentId,
            tenantId: context.tenantId,
        });

        logger.info(
            {
                documentId,
                userId: context.userId,
                tenantId: context.tenantId,
                title: document.title,
            },
            'document.delete.succeeded'
        );

        return { success: true };
    }

    async function updateDocumentTitle(
        documentId: string,
        context: { userId: string; tenantId: string },
        payload: UpdateDocumentTitlePayloadType
    ): Promise<UpdateDocumentTitleResultType> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        // Members can update documents (collaborative model)
        if (!membership) {
            logger.warn(
                {
                    documentId,
                    userId: context.userId,
                    tenantId: context.tenantId,
                },
                'document.update_title.forbidden'
            );
            return { success: false, error: 'forbidden' };
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            return { success: false, error: 'not_found' };
        }

        const title = payload.title.trim();

        if (!title) {
            return { success: false, error: 'invalid' };
        }

        const updated = await db.document.updateTitle(documentId, title);

        logger.info(
            {
                documentId,
                userId: context.userId,
                tenantId: context.tenantId,
                oldTitle: document.title,
                newTitle: updated.title,
            },
            'document.update_title.succeeded'
        );

        return {
            success: true,
            document: {
                id: updated.id,
                title: updated.title,
            },
        };
    }

    async function updateDocumentContent(
        documentId: string,
        context: { userId: string; tenantId: string },
        payload: { content: string }
    ): Promise<UpdateDocumentContentResultType> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        // Members can update documents (collaborative model)
        if (!membership) {
            logger.warn(
                {
                    documentId,
                    userId: context.userId,
                    tenantId: context.tenantId,
                },
                'document.update_content.forbidden'
            );
            return { success: false, error: 'forbidden' };
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            return { success: false, error: 'not_found' };
        }

        const content = payload.content;
        const updatedDocument = await db.document.updateContent(
            documentId,
            content
        );

        logger.info(
            {
                documentId,
                userId: context.userId,
                tenantId: context.tenantId,
                contentLength: content.length,
            },
            'document.update_content.succeeded'
        );

        return {
            success: true,
            document: {
                id: updatedDocument.id,
                updatedAt: updatedDocument.updatedAt.toISOString(),
            },
        };
    }

    async function queueDocumentReindexing(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<ReindexDocumentResultType> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        // Members can trigger reindex (collaborative model)
        if (!membership) {
            return { success: false, error: 'forbidden' };
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            return { success: false, error: 'not_found' };
        }

        await db.job.enqueueIndex(context.tenantId, documentId);

        const jobPayload: IndexDocumentJob = IndexDocumentJobSchema.parse({
            tenantId: context.tenantId,
            documentId,
        });

        const job = await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
            ...DEFAULT_QUEUE_OPTIONS,
        });

        // Increment queue depth when job is added
        metrics.queueDepth.inc({
            queue_name: JOBS.INDEX_DOCUMENT,
            tenant_id: context.tenantId,
        });

        logger.info(
            {
                documentId: documentId,
                jobId: job.id,
                tenantId: context.tenantId,
            },
            'queue.enqueue.succeeded'
        );

        return {
            success: true,
            jobId: String(job.id),
        };
    }

    return {
        createAndQueueDocument,
        getDocumentDetails,
        getDocumentList,
        deleteDocument,
        updateDocumentTitle,
        updateDocumentContent,
        queueDocumentReindexing,
    };
}

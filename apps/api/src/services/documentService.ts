import { db as defaultDb } from '@search-hub/db';
import {
    AppError,
    CreateDocumentRequestType,
    IndexDocumentJobSchema,
    JOBS,
    type DocumentDetailsType,
    type IndexDocumentJob,
    type UpdateDocumentTitlePayloadType,
    type DocumentListResultType,
    type TagListItemType,
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
    ): Promise<void>;

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
    ): Promise<{ id: string; title: string }>;

    updateDocumentContent(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { content: string }
    ): Promise<{ id: string; updatedAt: string }>;

    queueDocumentReindexing(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<string>;

    // Tag-related methods
    addTagsToDocument(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { tagIds: string[] }
    ): Promise<{
        added: TagListItemType[];
        alreadyExists: string[] | null;
        notFound: string[] | null;
    }>;

    removeTagFromDocument(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { tagId: string }
    ): Promise<string>;

    getDocumentTags(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<TagListItemType[]>;
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
    ): Promise<void> {
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
            throw AppError.authorization(
                'DOCUMENT_DELETE_FORBIDDEN',
                'Only owners and admins can delete documents',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'delete',
                    },
                }
            );
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            logger.warn(
                { documentId, tenantId: context.tenantId },
                'document.delete.not_found'
            );
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'delete',
                    },
                }
            );
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
    }

    async function updateDocumentTitle(
        documentId: string,
        context: { userId: string; tenantId: string },
        payload: UpdateDocumentTitlePayloadType
    ): Promise<{ id: string; title: string }> {
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
            throw AppError.authorization(
                'DOCUMENT_UPDATE_FORBIDDEN',
                'You do not have permission to update this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update',
                    },
                }
            );
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update',
                    },
                }
            );
        }

        const title = payload.title.trim();

        if (!title) {
            throw AppError.validation(
                'INVALID_DOCUMENT_TITLE',
                'Document title cannot be empty',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update',
                        metadata: { field: 'title' },
                    },
                }
            );
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
            id: updated.id,
            title: updated.title,
        };
    }

    async function updateDocumentContent(
        documentId: string,
        context: { userId: string; tenantId: string },
        payload: { content: string }
    ): Promise<{ id: string; updatedAt: string }> {
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
            throw AppError.authorization(
                'DOCUMENT_UPDATE_FORBIDDEN',
                'You do not have permission to update this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update',
                    },
                }
            );
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update',
                    },
                }
            );
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
            id: updatedDocument.id,
            updatedAt: updatedDocument.updatedAt.toISOString(),
        };
    }

    async function queueDocumentReindexing(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<string> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        // Members can trigger reindex (collaborative model)
        if (!membership) {
            throw AppError.authorization(
                'DOCUMENT_REINDEX_FORBIDDEN',
                'You do not have permission to reindex this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'reindex',
                    },
                }
            );
        }

        const document = await db.document.findUnique(documentId);

        if (!document || document.tenantId !== context.tenantId) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'reindex',
                    },
                }
            );
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

        return String(job.id);
    }

    async function getDocumentTags(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<TagListItemType[]> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership) {
            throw AppError.authorization(
                'DOCUMENT_TAGS_FETCH_FORBIDDEN',
                'You do not have permission to view tags on this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'view_tags',
                    },
                }
            );
        }

        const tags = await db.document.getDocumentTags(
            documentId,
            context.tenantId
        );

        if (!tags) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'view_tags',
                    },
                }
            );
        }

        const result = tags
            ? tags.map((tag) => ({
                  id: tag.tag.id,
                  name: tag.tag.name,
                  color: tag.tag.color,
              }))
            : [];

        return result;
    }

    async function addTagsToDocument(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { tagIds: string[] }
    ): Promise<{
        added: TagListItemType[];
        alreadyExists: string[] | null;
        notFound: string[] | null;
    }> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            throw AppError.authorization(
                'DOCUMENT_TAG_UPDATE_FORBIDDEN',
                'You do not have permission to update tags on this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update_tags',
                    },
                }
            );
        }

        const result = await db.document.addTagsToDocument(
            documentId,
            payload.tagIds,
            context.tenantId,
            context.userId
        );

        // matching the return type to the response schema
        return {
            added: result.added.map((tag) => {
                return {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                };
            }),
            alreadyExists: result.alreadyExists,
            notFound: result.notFound,
        };
    }

    async function removeTagFromDocument(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: { tagId: string }
    ): Promise<string> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership || membership.role === 'member') {
            throw AppError.authorization(
                'DOCUMENT_TAG_UPDATE_FORBIDDEN',
                'You do not have permission to update tags on this document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update_tags',
                    },
                }
            );
        }

        const result = await db.document.removeTagFromDocument(
            documentId,
            payload.tagId
        );
        if (result.count === 0) {
            throw AppError.notFound(
                'DOCUMENT_TAG_NOT_FOUND',
                'Tag not found on document',
                {
                    context: {
                        origin: 'app',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'remove_tag',
                    },
                }
            );
        }
        return 'success';
    }

    return {
        createAndQueueDocument,
        getDocumentDetails,
        getDocumentList,
        deleteDocument,
        updateDocumentTitle,
        updateDocumentContent,
        queueDocumentReindexing,
        addTagsToDocument,
        removeTagFromDocument,
        getDocumentTags,
    };
}

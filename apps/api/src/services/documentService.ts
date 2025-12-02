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
    type RemindCommandPayloadType,
    type UpdateDocumentIconPayloadType,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';
import {
    indexQueue as defaultIndexQueue,
    reminderQueue as defaultReminderQueue,
} from '../queue.js';
import { logger as defaultLogger } from '@search-hub/logger';
import type { Logger } from 'pino';
import { extractRemindCommands } from '../lib/reminders.js';

const DEFAULT_QUEUE_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs for debugging
};

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return null;
}

export interface DocumentServiceDependencies {
    db?: typeof defaultDb;
    indexQueue?: typeof defaultIndexQueue;
    reminderQueue?: typeof defaultReminderQueue;
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
        cursor?: string;
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

    updateDocumentIcon(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: UpdateDocumentIconPayloadType
    ): Promise<{ id: string; iconEmoji: string | null }>;

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

    // Favorite-related methods
    favoriteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<{ message: string }>;

    unfavoriteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<{ message: string }>;

    listUserReminders(context: { tenantId: string; userId: string }): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
            document: {
                id: string;
                title: string;
            };
        }[]
    >;
    listTenantReminders(context: { tenantId: string; userId: string }): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
            document: {
                id: string;
                title: string;
            };
        }[]
    >;

    listDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
        }[]
    >;

    deleteDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<void>;

    dismissReminder(
        reminderId: string,
        context: { tenantId: string; userId: string }
    ): Promise<void>;

    syncDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string },
        reminders: RemindCommandPayloadType[]
    ): Promise<void>;
}

export function createDocumentService(
    deps: DocumentServiceDependencies = {}
): DocumentService {
    const db = deps.db ?? defaultDb;
    const indexQueue = deps.indexQueue ?? defaultIndexQueue;
    const reminderQueue = deps.reminderQueue ?? defaultReminderQueue;
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

        const jobPayload: IndexDocumentJob = IndexDocumentJobSchema.parse({
            tenantId: doc.tenantId,
            documentId: doc.id,
        });

        // Queue-first pattern: add to BullMQ before DB
        // If BullMQ fails, no DB record is created (prevents desync)
        const job = await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
            ...DEFAULT_QUEUE_OPTIONS,
            jobId: `${doc.tenantId}-${doc.id}`, // Stable job ID to prevent duplicates
        });

        // Now safe to write to DB (if this fails, BullMQ job exists but will be handled)
        await db.job.enqueueIndex(context.tenantId, doc.id);

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
        limit = 20,
        cursor,
        favoritesOnly,
    }: {
        tenantId: string;
        userId: string;
        limit?: number;
        cursor?: string;
        favoritesOnly?: boolean;
    }): Promise<DocumentListResultType> {
        const decodedCursor = decodeCursor(cursor);
        const { items, hasMore, nextCursor } =
            await db.document.listTenantDocuments({
                tenantId,
                userId,
                cursor: decodedCursor,
                limit,
                favoritesOnly,
            });
        const mappedItems = items.map((item) => {
            const normalizedMetadata = normalizeMetadata(item.metadata);
            return {
                id: item.id,
                title: item.title,
                updatedAt: item.updatedAt.toISOString(),
                metadata: normalizedMetadata,
                isFavorite: item.isFavorite,
                summary: item.summary ?? null,
                createdById: item.createdById,
                createdByName: item.createdByName ?? 'Unknown',
                ownedByMe: item.ownedByMe ?? false,
                hasReminders: item.hasReminders ?? false,
                tags: (item.tags ?? []).map((tag) => ({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color ?? null,
                    description: tag.description ?? null,
                })),
            };
        });
        const encodedNextCursor =
            hasMore && nextCursor
                ? encodeCursor(nextCursor.updatedAt, nextCursor.id)
                : undefined;
        return {
            items: mappedItems,
            hasMore,
            nextCursor: encodedNextCursor,
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

        // Note: Reindex is handled by frontend via separate endpoint
        // to keep consistency with content update flow

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

        // Extract and sync reminders from document content
        const reminders = extractRemindCommands(content);
        await syncDocumentReminders(documentId, context, reminders);

        // Note: Reindex is handled by frontend via separate debounced endpoint
        // to avoid redundant embedding generation on every keystroke

        logger.info(
            {
                documentId,
                userId: context.userId,
                tenantId: context.tenantId,
                contentLength: content.length,
                remindersCount: reminders.length,
            },
            'document.update_content.succeeded'
        );

        return {
            id: updatedDocument.id,
            updatedAt: updatedDocument.updatedAt.toISOString(),
        };
    }

    async function updateDocumentIcon(
        documentId: string,
        context: { tenantId: string; userId: string },
        payload: UpdateDocumentIconPayloadType
    ): Promise<{ id: string; iconEmoji: string | null }> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership) {
            logger.warn(
                {
                    documentId,
                    userId: context.userId,
                    tenantId: context.tenantId,
                },
                'document.update_icon.forbidden'
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

        const normalizedEmoji =
            payload.iconEmoji && payload.iconEmoji.length > 0
                ? payload.iconEmoji
                : null;

        const updated = await db.document.updateIconEmoji(
            documentId,
            normalizedEmoji
        );

        const metadata =
            updated.metadata &&
            typeof updated.metadata === 'object' &&
            !Array.isArray(updated.metadata)
                ? (updated.metadata as Record<string, unknown>)
                : {};

        const storedEmoji =
            typeof metadata.iconEmoji === 'string' &&
            metadata.iconEmoji.length > 0
                ? metadata.iconEmoji
                : null;

        logger.info(
            {
                documentId,
                userId: context.userId,
                tenantId: context.tenantId,
                iconEmoji: storedEmoji,
            },
            'document.update_icon.succeeded'
        );

        return {
            id: updated.id,
            iconEmoji: storedEmoji,
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

        const jobPayload: IndexDocumentJob = IndexDocumentJobSchema.parse({
            tenantId: context.tenantId,
            documentId,
        });

        // Queue-first pattern: add to BullMQ before DB
        const job = await indexQueue.add(JOBS.INDEX_DOCUMENT, jobPayload, {
            ...DEFAULT_QUEUE_OPTIONS,
            jobId: `${context.tenantId}-${documentId}`, // Stable job ID to prevent duplicates
        });

        // Now safe to write to DB
        await db.job.enqueueIndex(context.tenantId, documentId);

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

    async function favoriteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<{ message: string }> {
        await db.document.favoriteDocument(documentId, context.userId);
        return { message: 'Document favorited successfully' };
    }

    async function unfavoriteDocument(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<{ message: string }> {
        await db.document.unfavoriteDocument(documentId, context.userId);
        return { message: 'Document unfavorited successfully' };
    }

    async function listUserReminders(context: {
        tenantId: string;
        userId: string;
    }): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
            document: {
                id: string;
                title: string;
            };
        }[]
    > {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership) {
            throw AppError.authorization(
                'REMINDER_ACCESS_FORBIDDEN',
                'You do not have permission to view reminders.',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        operation: 'list_user_reminders',
                    },
                }
            );
        }

        return db.documentCommand.getUserReminders(context.userId);
    }
    async function listTenantReminders(context: {
        tenantId: string;
        userId: string;
    }): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
            document: {
                id: string;
                title: string;
                tenantId?: string;
            };
        }[]
    > {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership) {
            throw AppError.authorization(
                'REMINDER_ACCESS_FORBIDDEN',
                'You do not have permission to view tenant reminders.',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        operation: 'list_tenant_reminders',
                    },
                }
            );
        }

        return db.documentCommand.getTenantReminders(context.tenantId);
    }

    async function listDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<
        {
            id: string;
            documentId: string;
            userId: string;
            body: unknown;
            createdAt: Date;
            document: {
                id: string;
                title: string;
            };
        }[]
    > {
        const document = await db.document.findUnique(documentId);
        if (!document || document.tenantId !== context.tenantId) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'list_document_reminders',
                    },
                }
            );
        }

        return db.documentCommand.getRemindersForDocument(
            documentId,
            context.userId
        );
    }

    async function deleteDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string }
    ): Promise<void> {
        const membership =
            await db.tenantMembership.findMembershipByUserIdAndTenantId({
                userId: context.userId,
                tenantId: context.tenantId,
            });

        if (!membership) {
            throw AppError.authorization(
                'REMINDER_DELETE_FORBIDDEN',
                'You do not have permission to delete reminders on this document.',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'delete_document_reminders',
                    },
                }
            );
        }

        await db.documentCommand.deleteDocumentReminders(documentId);
    }

    async function dismissReminder(
        reminderId: string,
        context: { tenantId: string; userId: string }
    ): Promise<void> {
        const reminder = await db.documentCommand.getById(reminderId);
        if (!reminder) {
            throw AppError.notFound(
                'REMINDER_NOT_FOUND',
                'Reminder not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        resource: 'DocumentCommand',
                        resourceId: reminderId,
                        operation: 'dismiss',
                    },
                }
            );
        }

        if (reminder.userId !== context.userId) {
            throw AppError.authorization(
                'REMINDER_DISMISS_FORBIDDEN',
                'You do not have permission to dismiss this reminder.',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        resource: 'DocumentCommand',
                        resourceId: reminderId,
                        operation: 'dismiss',
                    },
                }
            );
        }

        await db.documentCommand.updateToDone(reminderId);
    }

    async function syncDocumentReminders(
        documentId: string,
        context: { tenantId: string; userId: string },
        reminders: RemindCommandPayloadType[]
    ): Promise<void> {
        const document = await db.document.findUnique(documentId);
        if (!document || document.tenantId !== context.tenantId) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'app',
                        domain: 'reminders',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'sync_document_reminders',
                    },
                }
            );
        }

        // Sync reminders to database
        await db.documentCommand.syncDocumentReminders({
            documentId,
            userId: context.userId,
            reminders,
        });

        // Fetch the synced reminder commands to get their IDs
        const commands = await db.documentCommand.getUserReminders(
            context.userId
        );

        // Filter commands for this document
        const documentCommands = commands.filter(
            (cmd) => cmd.documentId === documentId
        );

        // Schedule BullMQ jobs for each reminder
        for (const command of documentCommands) {
            const body = command.body as RemindCommandPayloadType;

            // Only schedule jobs for reminders that are still scheduled (not done/dismissed)
            if (body.status !== 'scheduled') {
                continue;
            }

            // Calculate delay until reminder should fire
            const whenISO = body.whenISO;
            if (!whenISO) {
                logger.warn(
                    { commandId: command.id, body },
                    'Reminder missing whenISO, skipping job scheduling'
                );
                continue;
            }

            const targetTime = new Date(whenISO).getTime();
            const now = Date.now();
            const delay = Math.max(0, targetTime - now);

            // Schedule the reminder job
            await reminderQueue.add(
                JOBS.SEND_REMINDER,
                {
                    tenantId: context.tenantId,
                    documentCommandId: command.id,
                },
                {
                    delay, // Delay in milliseconds
                    jobId: `reminder-${command.id}`, // Use stable job ID to prevent duplicates
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );

            logger.info(
                {
                    commandId: command.id,
                    documentId,
                    delay,
                    whenISO,
                },
                'Scheduled reminder job'
            );
        }
    }

    return {
        createAndQueueDocument,
        getDocumentDetails,
        getDocumentList,
        deleteDocument,
        updateDocumentTitle,
        updateDocumentContent,
        updateDocumentIcon,
        queueDocumentReindexing,
        addTagsToDocument,
        removeTagFromDocument,
        getDocumentTags,
        favoriteDocument,
        unfavoriteDocument,
        listUserReminders,
        listTenantReminders,
        listDocumentReminders,
        deleteDocumentReminders,
        dismissReminder,
        syncDocumentReminders,
    };
}
function encodeCursor(updatedAt: Date, id: string) {
    return Buffer.from(
        JSON.stringify({ updatedAt: updatedAt.toISOString(), id })
    ).toString('base64');
}

function decodeCursor(cursor?: string) {
    if (!cursor) {
        return undefined;
    }
    try {
        const decoded = JSON.parse(
            Buffer.from(cursor, 'base64').toString('utf-8')
        ) as { updatedAt: string; id: string };
        return {
            updatedAt: new Date(decoded.updatedAt),
            id: decoded.id,
        };
    } catch {
        return undefined;
    }
}

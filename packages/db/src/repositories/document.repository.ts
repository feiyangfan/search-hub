import { Prisma } from '@prisma/client';
import { AppError } from '@search-hub/schemas';
import { prisma } from '../client.js';
import { DocumentSourceType } from '@search-hub/schemas';
import { Tag } from '@prisma/client';

export const documentRepository = {
    create: async ({
        tenantId,
        title,
        source = 'editor',
        sourceUrl,
        content,
        metadata,
        createdById,
        updatedById,
    }: {
        tenantId: string;
        title: string;
        source?: DocumentSourceType;
        sourceUrl?: string | null;
        content?: string | null;
        metadata?: Prisma.InputJsonValue | null;
        createdById: string;
        updatedById: string;
    }) => {
        try {
            const data: Prisma.DocumentCreateInput = {
                title,
                source,
                tenant: {
                    connect: { id: tenantId },
                },
                createdBy: {
                    connect: { id: createdById },
                },
                updatedBy: {
                    connect: { id: updatedById },
                },
            };

            if (sourceUrl !== undefined) {
                data.sourceUrl = sourceUrl ?? undefined;
            }

            if (content !== undefined) {
                data.content = content ?? undefined;
            }

            if (metadata !== undefined) {
                data.metadata = metadata ?? Prisma.JsonNull;
            }

            return await prisma.document.create({ data });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2002': // Unique constraint violation
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Document with this identifier already exists',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    case 'P2003': {
                        // Foreign key constraint violation
                        const target = error.meta?.field_name;
                        if (typeof target === 'string') {
                            if (target.includes('tenantId')) {
                                throw AppError.notFound(
                                    'TENANT_NOT_FOUND',
                                    'Tenant not found',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'documents',
                                            resource: 'Document',
                                            operation: 'create',
                                            metadata: { field: 'tenantId' },
                                        },
                                    }
                                );
                            }
                            if (target.includes('createdById')) {
                                throw AppError.validation(
                                    'INVALID_USER_ID',
                                    'Invalid creator user ID',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'documents',
                                            resource: 'Document',
                                            operation: 'create',
                                            metadata: {
                                                field: 'createdById',
                                            },
                                        },
                                    }
                                );
                            }
                            if (target.includes('updatedById')) {
                                throw AppError.validation(
                                    'INVALID_USER_ID',
                                    'Invalid updater user ID',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'documents',
                                            resource: 'Document',
                                            operation: 'create',
                                            metadata: {
                                                field: 'updatedById',
                                            },
                                        },
                                    }
                                );
                            }
                        }
                        // Fallback for other foreign key violations
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Invalid reference in document creation',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'create',
                                    metadata: {
                                        prismaCode: error.code,
                                        target,
                                    },
                                },
                            }
                        );
                    }

                    case 'P1001': // Can't reach database
                    case 'P1002': // Database timeout
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to create document',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'create',
                                    metadata: {
                                        prismaCode: error.code,
                                        message: error.message,
                                    },
                                },
                            }
                        );
                }
            }

            if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                throw AppError.internal(
                    'DB_UNKNOWN_ERROR',
                    'Database operation failed',
                    {
                        context: {
                            origin: 'database',
                            domain: 'documents',
                            resource: 'Document',
                            operation: 'create',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },
    findUnique: async (documentId: string) => {
        return prisma.document.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                tenantId: true,
                content: true,
                title: true,
            },
        });
    },
    getById: async ({
        documentId,
        userId,
        tenantId,
    }: {
        documentId: string;
        userId: string;
        tenantId: string;
    }) => {
        return prisma.document.findFirst({
            where: {
                id: documentId,
                tenantId,
            },
            include: {
                favorites: {
                    where: { userId },
                    select: { id: true },
                },
                commands: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    },
    deleteById: async ({
        documentId,
        tenantId,
    }: {
        documentId: string;
        tenantId: string;
    }) => {
        return prisma.document.delete({
            where: {
                id: documentId,
                tenantId,
            },
        });
    },
    listTenantDocuments: async ({
        tenantId,
        userId,
        cursor,
        limit = 20,
        favoritesOnly = false,
    }: {
        tenantId: string;
        userId: string;
        cursor?: {
            updatedAt: Date;
            id: string;
        };
        limit?: number;
        favoritesOnly?: boolean;
    }) => {
        try {
            const where: Prisma.DocumentWhereInput = {
                tenantId,
                ...(favoritesOnly
                    ? {
                          favorites: {
                              some: {
                                  userId,
                              },
                          },
                      }
                    : {}),
            };

            if (cursor) {
                const additionalCondition: Prisma.DocumentWhereInput = {
                    OR: [
                        { updatedAt: { lt: cursor.updatedAt } },
                        {
                            updatedAt: cursor.updatedAt,
                            id: { lt: cursor.id },
                        },
                    ],
                };
                if (Array.isArray(where.AND)) {
                    where.AND = [...where.AND, additionalCondition];
                } else if (where.AND) {
                    where.AND = [where.AND, additionalCondition];
                } else {
                    where.AND = [additionalCondition];
                }
            }

            const rawItems = await prisma.document.findMany({
                where,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                take: limit + 1,
                select: {
                    id: true,
                    title: true,
                    updatedAt: true,
                    metadata: true,
                    createdById: true,
                    createdBy: {
                        select: {
                            name: true,
                        },
                    },

                    favorites: {
                        where: { userId },
                        select: { id: true },
                    },
                    tags: {
                        include: {
                            tag: {
                                select: {
                                    id: true,
                                    name: true,
                                    color: true,
                                    description: true,
                                },
                            },
                        },
                    },
                    commands: {
                        where: {
                            body: {
                                path: ['kind'],
                                equals: 'remind',
                            },
                        },
                        select: { id: true },
                    },
                },
            });

            const hasMore = rawItems.length > limit;
            const sliced = hasMore ? rawItems.slice(0, limit) : rawItems;

            const lastItem = hasMore ? sliced[sliced.length - 1] : undefined;

            const items = sliced.map((item) => {
                const meta =
                    item.metadata && typeof item.metadata === 'object'
                        ? (item.metadata as Record<string, unknown>)
                        : undefined;
                const summary =
                    meta && typeof meta.summary === 'string'
                        ? meta.summary
                        : null;

                return {
                    id: item.id,
                    title: item.title,
                    updatedAt: item.updatedAt,
                    metadata: item.metadata,
                    summary,
                    createdById: item.createdById,
                    createdByName: item.createdBy?.name ?? 'Unknown',
                    ownedByMe: item.createdById === userId,
                    hasReminders: item.commands.length > 0,
                    tags: item.tags.map(({ tag }) => ({
                        id: tag.id,
                        name: tag.name,
                        color: tag.color ?? undefined,
                        description: tag.description ?? undefined,
                    })),
                    isFavorite: item.favorites.length > 0,
                };
            });

            return {
                items,
                hasMore,
                nextCursor:
                    hasMore && lastItem
                        ? {
                              updatedAt: lastItem.updatedAt,
                              id: lastItem.id,
                          }
                        : undefined,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2003': {
                        // Foreign key constraint violation
                        const target = error.meta?.field_name;
                        if (typeof target === 'string') {
                            if (target.includes('tenantId')) {
                                throw AppError.notFound(
                                    'TENANT_NOT_FOUND',
                                    'Tenant not found',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'documents',
                                            resource: 'Document',
                                            operation: 'list',
                                            metadata: { field: 'tenantId' },
                                        },
                                    }
                                );
                            }
                            if (target.includes('userId')) {
                                throw AppError.validation(
                                    'INVALID_USER_ID',
                                    'Invalid user ID provided',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'documents',
                                            resource: 'Document',
                                            operation: 'list',
                                            metadata: { field: 'userId' },
                                        },
                                    }
                                );
                            }
                        }
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Invalid reference in document query',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'list',
                                    metadata: {
                                        prismaCode: error.code,
                                        target,
                                    },
                                },
                            }
                        );
                    }

                    case 'P1001': // Can't reach database
                    case 'P1002': // Database timeout
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'list',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch documents',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documents',
                                    resource: 'Document',
                                    operation: 'list',
                                    metadata: {
                                        prismaCode: error.code,
                                        message: error.message,
                                    },
                                },
                            }
                        );
                }
            }

            if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                throw AppError.internal(
                    'DB_UNKNOWN_ERROR',
                    'Database query failed',
                    {
                        context: {
                            origin: 'database',
                            domain: 'documents',
                            resource: 'Document',
                            operation: 'list',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },
    updateTitle: async (documentId: string, title: string) => {
        // Update title and searchVector in a transaction
        return prisma.$transaction(async (tx) => {
            const updated = await tx.document.update({
                where: { id: documentId },
                data: { title },
            });

            // Update searchVector to reflect new title
            // Weight A for title (higher priority), Weight B for content
            await tx.$executeRaw`
                    UPDATE "Document" d
                    SET "searchVector" =
                        setweight(to_tsvector('english', d."title"), 'A') ||
                        setweight(
                            to_tsvector(
                                'english',
                                COALESCE(
                                    (
                                        SELECT string_agg(dc."content", ' ' ORDER BY dc."idx")
                                        FROM "DocumentChunk" dc
                                        WHERE dc."documentId" = d."id"
                                    ),
                                    d."content",
                                    ''
                                )
                            ),
                            'B'
                        )
                    WHERE d."id" = ${documentId};
                `;

            return updated;
        });
    },
    updateContent: async (documentId: string, content: string) => {
        return prisma.document.update({
            where: { id: documentId },
            data: { content },
        });
    },
    updateIconEmoji: async (documentId: string, iconEmoji?: string | null) => {
        const current = await prisma.document.findUnique({
            where: { id: documentId },
            select: { metadata: true },
        });

        if (!current) {
            throw AppError.notFound(
                'DOCUMENT_NOT_FOUND',
                'Document not found',
                {
                    context: {
                        origin: 'database',
                        domain: 'documents',
                        resource: 'Document',
                        resourceId: documentId,
                        operation: 'update_icon',
                    },
                }
            );
        }

        const metadataObject: Record<string, unknown> =
            current.metadata && typeof current.metadata === 'object'
                ? Array.isArray(current.metadata)
                    ? {}
                    : { ...current.metadata }
                : {};

        if (iconEmoji && iconEmoji.length > 0) {
            metadataObject.iconEmoji = iconEmoji;
        } else {
            delete metadataObject.iconEmoji;
        }

        return prisma.document.update({
            where: { id: documentId },
            data: {
                metadata: metadataObject as Prisma.JsonObject,
            },
            select: {
                id: true,
                metadata: true,
            },
        });
    },
    replaceChunksWithEmbeddings: async ({
        tenantId,
        documentId,
        chunks,
        vectors,
        checksum,
    }: {
        tenantId: string;
        documentId: string;
        chunks: { idx: number; text: string }[];
        vectors: number[][];
        checksum: string;
    }) => {
        if (chunks.length !== vectors.length) {
            throw new Error('Chunk count and vector count must match');
        }

        await prisma.$transaction(async (tx) => {
            await tx.documentChunk.deleteMany({ where: { documentId } });

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const vector = vectors[i];

                if (!chunk || !vector) {
                    throw new Error(`Chunk/vector mismatch at index ${i}`);
                }

                await tx.$executeRawUnsafe(
                    `
                        INSERT INTO "DocumentChunk"
                          ("id","tenantId","documentId","idx","content","embedding","createdAt")
                        VALUES
                          (gen_random_uuid(), $1, $2, $3, $4, $5::vector, now())
                        `,
                    tenantId,
                    documentId,
                    chunk.idx,
                    chunk.text,
                    `[${vector.join(',')}]`
                );
            }

            await tx.$executeRaw`
                    UPDATE "Document" d
                    SET "searchVector" =
                        setweight(to_tsvector('english', d."title"), 'A') ||
                        setweight(
                            to_tsvector(
                                'english',
                                COALESCE(
                                    (
                                        SELECT string_agg(dc."content", ' ' ORDER BY dc."idx")
                                        FROM "DocumentChunk" dc
                                        WHERE dc."documentId" = d."id"
                                    ),
                                    d."content",
                                    ''
                                )
                            ),
                            'B'
                        )
                    WHERE d."id" = ${documentId};
                `;

            await tx.documentIndexState.upsert({
                where: { documentId },
                create: {
                    documentId,
                    lastChecksum: checksum,
                    lastIndexedAt: new Date(),
                },
                update: {
                    lastChecksum: checksum,
                    lastIndexedAt: new Date(),
                },
            });
        });
    },
    getDocumentTags: async (documentId: string, tenantId: string) => {
        // First verify the document belongs to the tenant
        const document = await prisma.document.findFirst({
            where: {
                id: documentId,
                tenantId,
            },
            select: { id: true },
        });

        if (!document) {
            return null; // Document not found or doesn't belong to tenant
        }

        return prisma.documentTag.findMany({
            where: { documentId },
            include: {
                tag: true,
            },
        });
    },
    addTagsToDocument: async (
        documentId: string,
        tagIds: string[],
        tenantId: string,
        userId: string
    ) => {
        const addedTags: Tag[] = [];
        const alreadyExists: string[] = [];
        const notFound: string[] = [];

        await prisma.$transaction(async (tx) => {
            // Verify document belongs to tenant
            const document = await tx.document.findFirst({
                where: {
                    id: documentId,
                    tenantId,
                },
                select: { id: true },
            });

            if (!document) {
                throw AppError.notFound(
                    'DOCUMENT_NOT_FOUND',
                    'Document not found',
                    {
                        context: {
                            origin: 'database',
                            domain: 'documents',
                            resource: 'Document',
                            resourceId: documentId,
                            operation: 'addTags',
                        },
                    }
                );
            }

            // Verify all tags exist and belong to tenant
            const existingTags = await tx.tag.findMany({
                where: {
                    id: { in: tagIds },
                    tenantId,
                },
                select: { id: true },
            });

            const existingTagIds = new Set(existingTags.map((t) => t.id));

            // Track which tags weren't found
            for (const tagId of tagIds) {
                if (!existingTagIds.has(tagId)) {
                    notFound.push(tagId);
                }
            }

            // Only process valid tags
            const validTagIds = tagIds.filter((id) => existingTagIds.has(id));

            for (const tagId of validTagIds) {
                const existing = await tx.documentTag.findUnique({
                    where: {
                        documentId_tagId: {
                            documentId,
                            tagId,
                        },
                    },
                });

                if (existing) {
                    alreadyExists.push(tagId);
                    continue;
                }

                const newDocTag = await tx.documentTag.create({
                    data: {
                        documentId,
                        tagId,
                        addedById: userId,
                    },
                    include: {
                        tag: true,
                    },
                });

                addedTags.push(newDocTag.tag);
            }
        });

        return { added: addedTags, alreadyExists, notFound };
    },
    removeTagFromDocument: async (documentId: string, tagId: string) => {
        return prisma.documentTag.deleteMany({
            where: { documentId, tagId },
        });
    },
    // Favorite document
    favoriteDocument: async (documentId: string, userId: string) => {
        return prisma.documentFavorite.create({
            data: {
                documentId,
                userId,
            },
        });
    },
    // Unfavorite document
    unfavoriteDocument: async (documentId: string, userId: string) => {
        return prisma.documentFavorite.deleteMany({
            where: {
                documentId,
                userId,
            },
        });
    },
    /**
     * Find documents that need reindexing
     * A document is stale if:
     * 1. Has content AND never indexed (lastIndexedAt is NULL)
     * 2. Has content AND updated significantly after last index (> 1 second buffer for timing issues)
     * 3. Has chunks but no index state (data inconsistency)
     *
     * Note: We use a 1-second buffer for updatedAt comparison because Prisma's @updatedAt
     * can be set milliseconds after lastIndexedAt within the same transaction, causing false positives.
     *
     * Excludes:
     * - Documents with no content that were already processed (empty docs)
     * - Documents with content that hasn't changed since last index
     *
     * Note: By default this is system-wide (all tenants) for the periodic sync job.
     * Pass tenantId to limit to a specific workspace.
     */
    findStaleDocuments: async (limit = 100, tenantId?: string) => {
        const staleDocuments = await prisma.$queryRaw<
            {
                id: string;
                tenantId: string;
                title: string;
                updatedAt: Date;
                lastIndexedAt: Date | null;
            }[]
        >`
            SELECT 
                d.id,
                d."tenantId",
                d.title,
                d."updatedAt",
                dis."lastIndexedAt"
            FROM "Document" d
            LEFT JOIN "DocumentIndexState" dis ON d.id = dis."documentId"
            WHERE (
                -- Case 1: Has content and never indexed
                (dis."lastIndexedAt" IS NULL 
                 AND d.content IS NOT NULL 
                 AND d.content != '')
                -- Case 2: Has content and updated after last index
                OR (d."updatedAt" > dis."lastIndexedAt"
                    AND d.content IS NOT NULL 
                    AND d.content != '')
                -- Case 3: Has chunks but no index state (data inconsistency - should rarely happen)
                OR (dis."lastIndexedAt" IS NULL 
                    AND EXISTS (
                        SELECT 1 FROM "DocumentChunk" dc 
                        WHERE dc."documentId" = d.id
                    ))
            )
              ${
                  tenantId
                      ? Prisma.sql`AND d."tenantId" = ${tenantId}`
                      : Prisma.empty
              }
            ORDER BY d."updatedAt" DESC
            LIMIT ${limit}
        `;

        return staleDocuments;
    },
    /**
     * Count documents by indexing status
     */ countTotal: async (tenantId: string) => {
        return prisma.document.count({ where: { tenantId } });
    },

    countIndexed: async (tenantId: string) => {
        return prisma.documentIndexState.count({
            where: { document: { tenantId } },
        });
    },

    countWithContentButNoChunks: async (tenantId: string) => {
        return prisma.document.count({
            where: {
                tenantId,
                AND: [
                    {
                        OR: [
                            { content: { not: null } },
                            { content: { not: '' } },
                        ],
                    },
                    { chunks: { none: {} } },
                ],
            },
        });
    },

    countChunks: async (tenantId: string) => {
        return prisma.documentChunk.count({ where: { tenantId } });
    },

    /**
     * Find documents with failed jobs
     */
    findWithFailedJobs: async (tenantId: string, limit = 50) => {
        return prisma.document.findMany({
            where: {
                tenantId,
                jobs: {
                    some: {
                        status: 'failed',
                    },
                },
            },
            select: {
                id: true,
                title: true,
                tenantId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        chunks: true,
                    },
                },
                indexState: {
                    select: {
                        lastChecksum: true,
                        lastIndexedAt: true,
                    },
                },
                jobs: {
                    where: {
                        status: 'failed',
                    },
                    select: {
                        id: true,
                        status: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: limit,
        });
    },

    /**
     * Find documents stuck in queue
     */
    findStuckInQueue: async (
        tenantId: string,
        stuckThreshold: Date,
        limit = 50
    ) => {
        return prisma.document.findMany({
            where: {
                tenantId,
                jobs: {
                    some: {
                        status: 'queued',
                        updatedAt: {
                            lt: stuckThreshold,
                        },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                tenantId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        chunks: true,
                    },
                },
                indexState: {
                    select: {
                        lastChecksum: true,
                        lastIndexedAt: true,
                    },
                },
                jobs: {
                    where: {
                        status: 'queued',
                    },
                    select: {
                        id: true,
                        status: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                },
            },
            orderBy: {
                updatedAt: 'asc',
            },
            take: limit,
        });
    },

    /**
     * Find documents with content but no chunks
     */
    findWithEmptyChunks: async (tenantId: string, limit = 50) => {
        return prisma.document.findMany({
            where: {
                tenantId,
                AND: [
                    {
                        OR: [
                            { content: { not: null } },
                            { content: { not: '' } },
                        ],
                    },
                    { chunks: { none: {} } },
                ],
            },
            select: {
                id: true,
                title: true,
                tenantId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        chunks: true,
                    },
                },
                indexState: {
                    select: {
                        lastChecksum: true,
                        lastIndexedAt: true,
                    },
                },
                jobs: {
                    select: {
                        id: true,
                        status: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: limit,
        });
    },

    /**
     * Find recently indexed documents
     */
    findRecentlyIndexed: async (tenantId: string, limit = 10) => {
        return prisma.document.findMany({
            where: {
                tenantId,
                indexState: {
                    isNot: null,
                },
            },
            select: {
                id: true,
                title: true,
                tenantId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        chunks: true,
                    },
                },
                indexState: {
                    select: {
                        lastChecksum: true,
                        lastIndexedAt: true,
                    },
                },
                jobs: {
                    where: {
                        status: 'indexed',
                    },
                    select: {
                        id: true,
                        status: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                },
            },
            orderBy: {
                indexState: {
                    lastIndexedAt: 'desc',
                },
            },
            take: limit,
        });
    },
};

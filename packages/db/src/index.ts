import { PrismaClient, Tag } from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { loadDbEnv } from '@search-hub/config-env';
import { DocumentSourceType } from '@search-hub/schemas';
import {
    DatabaseError,
    TenantNotFoundError,
    ValidationError,
    AuthorizationError,
    NotFoundError,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';

const env: ReturnType<typeof loadDbEnv> = loadDbEnv();
/**
 * Create a single PrismaClient instance.
 * In dev, Next/tsx hot reload can instantiate multiple times — guard with global.
 * Ref: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = basePrismaClient;
}

// Extend Prisma client with query duration tracking
// Note: Prisma extension API returns 'any' types - this is expected and safe
export const prisma = basePrismaClient.$extends({
    query: {
        $allOperations: async ({ operation, model, args, query }) => {
            const startTime = Date.now();

            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const result = await query(args);
                const duration = (Date.now() - startTime) / 1000; // Convert to seconds

                // Track successful query duration
                metrics.dbQueryDuration.observe(
                    {
                        operation, // findMany, create, update, delete, etc.
                        table: model || 'unknown', // User, Document, Tenant, etc.
                    },
                    duration
                );

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return result;
            } catch (error) {
                // Track failed query duration too (important for slow failing queries)
                const duration = (Date.now() - startTime) / 1000;

                metrics.dbQueryDuration.observe(
                    {
                        operation,
                        table: model || 'unknown',
                    },
                    duration
                );

                // Track database errors
                metrics.dbErrors.inc({
                    tenant_id: 'unknown', // Context doesn't have tenant_id here
                    operation,
                });

                throw error;
            }
        },
    },
});

/** Repository-like helpers so handlers stay clean */
export interface UserTenant {
    tenantId: string;
    tenantName: string;
    role: 'owner' | 'admin' | 'member';
}

export const db = {
    user: {
        create: async ({
            email,
            passwordHash,
        }: {
            email: string;
            passwordHash: string;
        }) => {
            try {
                // Optimistic check for better UX (faster response)
                const found = await prisma.user.findUnique({
                    where: { email },
                });

                if (found) {
                    throw new ValidationError(
                        'User with this email already exists',
                        'email'
                    );
                }

                return await prisma.user.create({
                    data: { email, passwordHash },
                });
            } catch (error) {
                // Handle structured errors (re-throw as-is)
                if (error instanceof ValidationError) {
                    throw error;
                }

                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2002': {
                            // Unique constraint violation (race condition)
                            const target = error.meta?.target;
                            if (
                                Array.isArray(target) &&
                                target.includes('email')
                            ) {
                                throw new ValidationError(
                                    'User with this email already exists',
                                    'email'
                                );
                            }
                            if (
                                typeof target === 'string' &&
                                target.includes('email')
                            ) {
                                throw new ValidationError(
                                    'User with this email already exists',
                                    'email'
                                );
                            }
                            // Fallback for other unique constraints
                            throw new DatabaseError(
                                'Unique constraint violation',
                                'user_create',
                                {
                                    email: '[REDACTED]',
                                    prismaCode: error.code,
                                }
                            );
                        }

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'user_create',
                                { prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to create user',
                                'user_create',
                                {
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'user_create',
                        { originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        deleteSelf: async ({
            userId,
            requesterId,
        }: {
            userId: string;
            requesterId: string;
        }) => {
            try {
                // Authorization check - only users can delete themselves
                if (userId !== requesterId) {
                    throw new AuthorizationError(
                        'You do not have permission to delete this user'
                    );
                }

                // Business rule check - can't delete if they own tenants
                const ownsTenant = await prisma.tenantMembership.findFirst({
                    where: { userId, role: 'owner' },
                    select: { tenantId: true },
                });

                if (ownsTenant) {
                    throw new ValidationError(
                        'Transfer or delete owned tenants before deleting the user',
                        'tenantOwnership'
                    );
                }

                await prisma.user.delete({ where: { id: userId } });
            } catch (error) {
                // Handle structured errors (re-throw as-is)
                if (
                    error instanceof AuthorizationError ||
                    error instanceof ValidationError
                ) {
                    throw error;
                }

                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2025': // Record not found
                            throw new NotFoundError('User', userId);

                        case 'P2003': // Foreign key constraint violation
                            throw new DatabaseError(
                                'Cannot delete user with existing references',
                                'user_delete',
                                { userId, requesterId, prismaCode: error.code }
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'user_delete',
                                { userId, requesterId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to delete user',
                                'user_delete',
                                {
                                    userId,
                                    requesterId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'user_delete',
                        { userId, requesterId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        findByEmail: async ({ email }: { email: string }) => {
            try {
                return await prisma.user.findUnique({ where: { email } });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'user_find_by_email',
                                { email: '[REDACTED]', prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch user',
                                'user_find_by_email',
                                {
                                    email: '[REDACTED]',
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'user_find_by_email',
                        { email: '[REDACTED]', originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        findById: async ({ id }: { id: string }) => {
            try {
                return await prisma.user.findUnique({ where: { id } });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'user_find_by_id',
                                { userId: id, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch user',
                                'user_find_by_id',
                                {
                                    userId: id,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'user_find_by_id',
                        { userId: id, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
    },
    tenant: {
        createWithOwner: async ({
            name,
            ownerId,
        }: {
            name: string;
            ownerId: string;
        }) => {
            try {
                const tenant = await prisma.tenant.create({
                    data: {
                        name,
                        memberships: {
                            create: { userId: ownerId, role: 'owner' },
                        },
                    },
                });

                return tenant;
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2002': {
                            // Unique constraint violation
                            // Check which constraint was violated
                            const target = error.meta?.target;
                            if (
                                Array.isArray(target) &&
                                target.includes('name')
                            ) {
                                throw new ValidationError(
                                    'A tenant with this name already exists',
                                    'name'
                                );
                            }
                            // Also handle string target (some Prisma versions)
                            if (
                                typeof target === 'string' &&
                                target.includes('name')
                            ) {
                                throw new ValidationError(
                                    'A tenant with this name already exists',
                                    'name'
                                );
                            }
                            // Fallback for other unique constraints
                            throw new DatabaseError(
                                'Unique constraint violation',
                                'tenant_create',
                                { ownerId, name, prismaCode: error.code }
                            );
                        }

                        case 'P2003': // Foreign key constraint violation
                            // This would happen if ownerId doesn't exist
                            throw new ValidationError(
                                'Invalid user ID provided',
                                'ownerId'
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tenant_create',
                                { ownerId, name, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to create tenant',
                                'tenant_create',
                                {
                                    ownerId,
                                    name,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'tenant_create',
                        { ownerId, name, originalMessage: error.message }
                    );
                }

                // Re-throw other errors (validation, etc.)
                throw error;
            }
        },
        deleteOwnedTenant: async ({
            tenantId,
            requesterId,
        }: {
            tenantId: string;
            requesterId: string;
        }) => {
            try {
                const tenantMembership =
                    await prisma.tenantMembership.findUnique({
                        where: {
                            tenantId_userId: {
                                tenantId: tenantId,
                                userId: requesterId,
                            },
                        },
                    });

                if (!tenantMembership) {
                    throw new TenantNotFoundError(tenantId);
                }

                if (tenantMembership.role !== 'owner') {
                    throw new AuthorizationError(
                        'Only the tenant owner can delete the workspace'
                    );
                }

                await prisma.tenant.delete({
                    where: { id: tenantId },
                });
            } catch (error) {
                // Handle structured errors (re-throw as-is)
                if (
                    error instanceof TenantNotFoundError ||
                    error instanceof AuthorizationError
                ) {
                    throw error;
                }

                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2025': // Record not found during delete
                            throw new TenantNotFoundError(tenantId);

                        case 'P2003': // Foreign key constraint violation
                            throw new DatabaseError(
                                'Cannot delete tenant with existing references',
                                'tenant_delete',
                                {
                                    tenantId,
                                    requesterId,
                                    prismaCode: error.code,
                                }
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tenant_delete',
                                {
                                    tenantId,
                                    requesterId,
                                    prismaCode: error.code,
                                }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to delete tenant',
                                'tenant_delete',
                                {
                                    tenantId,
                                    requesterId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'tenant_delete',
                        {
                            tenantId,
                            requesterId,
                            originalMessage: error.message,
                        }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        findById: async (tenantId: string) => {
            try {
                return await prisma.tenant.findUnique({
                    where: {
                        id: tenantId,
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tenant_find_by_id',
                                { tenantId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch tenant',
                                'tenant_find_by_id',
                                {
                                    tenantId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'tenant_find_by_id',
                        { tenantId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors (validation, etc.)
                throw error;
            }
        },
        listForUser: async ({
            userId,
        }: {
            userId: string;
        }): Promise<UserTenant[]> => {
            try {
                const memberships = await prisma.tenantMembership.findMany({
                    where: { userId },
                    include: {
                        tenant: {
                            select: { id: true, name: true },
                        },
                    },
                });

                return memberships
                    .filter((membership) => membership.tenant !== null)
                    .map((membership) => ({
                        tenantId: membership.tenant.id,
                        tenantName: membership.tenant.name,
                        role: membership.role,
                    }));
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tenant_list_query',
                                { userId, prismaCode: error.code }
                            );
                        case 'P2025': // Record not found (shouldn't happen for this query)
                            throw new TenantNotFoundError(userId);
                        default:
                            throw new DatabaseError(
                                'Failed to fetch tenant list',
                                'tenant_list_query',
                                {
                                    userId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'tenant_list_query',
                        { userId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors (validation, etc.)
                throw error;
            }
        },
    },
    tenantMembership: {
        findByUserId: async ({ userId }: { userId: string }) => {
            return prisma.tenantMembership.findMany({
                where: {
                    userId: userId,
                },
            });
        },
        findUserTenantsByUserId: async ({
            userId,
        }: {
            userId: string;
        }): Promise<UserTenant[]> => {
            const memberships = await prisma.tenantMembership.findMany({
                where: {
                    userId: userId,
                },
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            return memberships
                .filter((membership) => membership.tenant !== null)
                .map((membership) => ({
                    tenantId: membership.tenant.id,
                    tenantName: membership.tenant.name,
                    role: membership.role,
                }));
        },
        findMembershipByUserIdAndTenantId: async ({
            userId,
            tenantId,
        }: {
            userId: string;
            tenantId: string;
        }) => {
            return await prisma.tenantMembership.findUnique({
                where: {
                    tenantId_userId: {
                        userId: userId,
                        tenantId: tenantId,
                    },
                },
            });
        },
    },

    document: {
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
                            throw new DatabaseError(
                                'Document with this identifier already exists',
                                'document_create',
                                { tenantId, title, prismaCode: error.code }
                            );

                        case 'P2003': {
                            // Foreign key constraint violation
                            {
                                const target = error.meta?.field_name;
                                if (typeof target === 'string') {
                                    if (target.includes('tenantId')) {
                                        throw new TenantNotFoundError(tenantId);
                                    }
                                    if (target.includes('createdById')) {
                                        throw new ValidationError(
                                            'Invalid creator user ID',
                                            'createdById'
                                        );
                                    }
                                    if (target.includes('updatedById')) {
                                        throw new ValidationError(
                                            'Invalid updater user ID',
                                            'updatedById'
                                        );
                                    }
                                }
                            }
                            // Fallback for other foreign key violations
                            throw new DatabaseError(
                                'Invalid reference in document creation',
                                'document_create',
                                { tenantId, title, prismaCode: error.code }
                            );
                        }

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'document_create',
                                { tenantId, title, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to create document',
                                'document_create',
                                {
                                    tenantId,
                                    title,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'document_create',
                        { tenantId, title, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
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
            limit = 20,
            offset = 0,
            favoritesOnly = false,
        }: {
            tenantId: string;
            userId: string;
            limit?: number;
            offset?: number;
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

                const [items, total] = await prisma.$transaction([
                    prisma.document.findMany({
                        where,
                        orderBy: { updatedAt: 'desc' },
                        skip: offset,
                        take: limit,
                        select: {
                            id: true,
                            title: true,
                            updatedAt: true,
                            favorites: {
                                where: { userId },
                                select: { id: true },
                            },
                        },
                    }),
                    prisma.document.count({ where }),
                ]);

                return {
                    items: items.map((item) => ({
                        id: item.id,
                        title: item.title,
                        updatedAt: item.updatedAt,
                        isFavorite: item.favorites.length > 0,
                    })),
                    total,
                };
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2003': {
                            // Foreign key constraint violation
                            // This could happen if tenantId or userId doesn't exist
                            const target = error.meta?.field_name;
                            if (typeof target === 'string') {
                                if (target.includes('tenantId')) {
                                    throw new TenantNotFoundError(tenantId);
                                }
                                if (target.includes('userId')) {
                                    throw new ValidationError(
                                        'Invalid user ID provided',
                                        'userId'
                                    );
                                }
                            }
                            throw new DatabaseError(
                                'Invalid reference in document query',
                                'document_list',
                                { tenantId, userId, prismaCode: error.code }
                            );
                        }

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'document_list',
                                { tenantId, userId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch documents',
                                'document_list',
                                {
                                    tenantId,
                                    userId,
                                    limit,
                                    offset,
                                    favoritesOnly,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'document_list',
                        {
                            tenantId,
                            userId,
                            originalMessage: error.message,
                        }
                    );
                }

                // Re-throw other errors
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
                    throw new Error('Document not found or access denied');
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
                const validTagIds = tagIds.filter((id) =>
                    existingTagIds.has(id)
                );

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
    },
    tag: {
        findByIdWithCount: async (tagId: string, tenantId: string) => {
            try {
                return await prisma.tag.findFirst({
                    where: { id: tagId, tenantId },
                    include: {
                        _count: {
                            select: { documentTags: true },
                        },
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tag_find_by_id',
                                { tagId, tenantId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch tag',
                                'tag_find_by_id',
                                {
                                    tagId,
                                    tenantId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'tag_find_by_id',
                        { tagId, tenantId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        listTags: async (
            tenantId: string,
            options?: {
                includeCount?: boolean;
                sortBy?: 'name' | 'createdAt' | 'documentCount';
                order?: 'asc' | 'desc';
            }
        ) => {
            try {
                const {
                    includeCount = false,
                    sortBy = 'name',
                    order = 'asc',
                } = options || {};

                return await prisma.tag.findMany({
                    where: { tenantId },
                    orderBy:
                        sortBy === 'name'
                            ? { name: order }
                            : { createdAt: order },
                    ...(includeCount && {
                        include: {
                            _count: {
                                select: { documentTags: true },
                            },
                        },
                    }),
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tag_list',
                                { tenantId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to fetch tags',
                                'tag_list',
                                {
                                    tenantId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database query failed',
                        'tag_list',
                        { tenantId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        createTag: async ({
            tenantId,
            userId,
            name,
            color,
            description,
        }: {
            tenantId: string;
            userId: string;
            name: string;
            color?: string | null;
            description?: string | null;
        }) => {
            try {
                return await prisma.tag.create({
                    data: {
                        tenantId,
                        createdById: userId,
                        name,
                        color,
                        description,
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2002': {
                            // Unique constraint violation (tenantId, name)
                            const target = error.meta?.target;
                            if (
                                (Array.isArray(target) &&
                                    target.includes('name')) ||
                                (typeof target === 'string' &&
                                    target.includes('name'))
                            ) {
                                throw new ValidationError(
                                    'Tag with this name already exists in workspace',
                                    'name'
                                );
                            }
                            // Fallback for other unique constraints
                            throw new DatabaseError(
                                'Unique constraint violation',
                                'tag_create',
                                { tenantId, name, prismaCode: error.code }
                            );
                        }

                        case 'P2003': {
                            // Foreign key constraint violation
                            const target = error.meta?.field_name;
                            if (typeof target === 'string') {
                                if (target.includes('tenantId')) {
                                    throw new TenantNotFoundError(tenantId);
                                }
                                if (target.includes('createdById')) {
                                    throw new ValidationError(
                                        'Invalid user ID provided',
                                        'createdById'
                                    );
                                }
                            }
                            throw new DatabaseError(
                                'Invalid reference in tag creation',
                                'tag_create',
                                { tenantId, userId, prismaCode: error.code }
                            );
                        }

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tag_create',
                                { tenantId, name, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to create tag',
                                'tag_create',
                                {
                                    tenantId,
                                    name,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'tag_create',
                        { tenantId, name, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        updateTag: async ({
            tagId,
            tenantId,
            name,
            color,
            description,
        }: {
            tagId: string;
            tenantId: string;
            name?: string;
            color?: string | null;
            description?: string | null;
        }) => {
            try {
                // First verify tag exists and belongs to tenant
                const tag = await prisma.tag.findFirst({
                    where: { id: tagId, tenantId },
                });

                if (!tag) {
                    return null;
                }

                // Update and return the updated tag
                return await prisma.tag.update({
                    where: { id: tagId },
                    data: {
                        ...(name !== undefined && { name }),
                        ...(color !== undefined && { color }),
                        ...(description !== undefined && { description }),
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2002': {
                            // Unique constraint violation (duplicate name)
                            const target = error.meta?.target;
                            if (
                                (Array.isArray(target) &&
                                    target.includes('name')) ||
                                (typeof target === 'string' &&
                                    target.includes('name'))
                            ) {
                                throw new ValidationError(
                                    'Tag with this name already exists in workspace',
                                    'name'
                                );
                            }
                            throw new DatabaseError(
                                'Unique constraint violation',
                                'tag_update',
                                { tagId, tenantId, prismaCode: error.code }
                            );
                        }

                        case 'P2025': // Record not found
                            throw new NotFoundError('Tag', tagId);

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tag_update',
                                { tagId, tenantId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to update tag',
                                'tag_update',
                                {
                                    tagId,
                                    tenantId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'tag_update',
                        { tagId, tenantId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
        deleteTag: async (tagId: string, tenantId: string) => {
            try {
                const result = await prisma.tag.deleteMany({
                    where: { id: tagId, tenantId },
                });
                return result.count;
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2025': // Record not found
                            throw new NotFoundError('Tag', tagId);

                        case 'P2003': // Foreign key constraint violation
                            throw new DatabaseError(
                                'Cannot delete tag with existing references',
                                'tag_delete',
                                { tagId, tenantId, prismaCode: error.code }
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw new DatabaseError(
                                'Database connection failed',
                                'tag_delete',
                                { tagId, tenantId, prismaCode: error.code }
                            );

                        default:
                            throw new DatabaseError(
                                'Failed to delete tag',
                                'tag_delete',
                                {
                                    tagId,
                                    tenantId,
                                    prismaCode: error.code,
                                    originalMessage: error.message,
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw new DatabaseError(
                        'Database operation failed',
                        'tag_delete',
                        { tagId, tenantId, originalMessage: error.message }
                    );
                }

                // Re-throw other errors
                throw error;
            }
        },
    },
    documentIndexState: {
        findUnique: async (documentId: string) => {
            return prisma.documentIndexState.findUnique({
                where: {
                    documentId,
                },
                select: { lastChecksum: true },
            });
        },
    },
    job: {
        /** API uses this immediately after creating the Document */
        enqueueIndex: async (tenantId: string, documentId: string) => {
            return prisma.indexJob.create({
                data: { tenantId, documentId, status: 'queued' },
            });
        },

        /** Worker: queued -> processing (idempotent; returns how many rows changed) */
        startProcessing: async (tenantId: string, documentId: string) => {
            const res = await prisma.indexJob.updateMany({
                where: { tenantId, documentId, status: 'queued' },
                data: { status: 'processing' },
            });
            return res.count;
        },

        /** Worker: processing -> indexed */
        markIndexed: async (tenantId: string, documentId: string) => {
            const res = await prisma.indexJob.updateMany({
                where: { tenantId, documentId, status: 'processing' },
                data: { status: 'indexed' },
            });
            return res.count;
        },

        /** Worker: processing -> failed (records error text) */
        markFailed: async (
            tenantId: string,
            documentId: string,
            error: string
        ) => {
            const res = await prisma.indexJob.updateMany({
                where: { tenantId, documentId, status: 'processing' },
                data: { status: 'failed', error },
            });
            return res.count;
        },
    },
};

import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { loadDbEnv } from '@search-hub/config-env';
import { DocumentSourceType } from '@search-hub/schemas';

const env = loadDbEnv();
/**
 * Create a single PrismaClient instance.
 * In dev, Next/tsx hot reload can instantiate multiple times — guard with global.
 * Ref: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (env.NODE_ENV === 'development') {
    globalForPrisma.prisma = prisma;
}

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
                const found = await prisma.user.findUnique({
                    where: { email },
                });

                if (found) {
                    throw Object.assign(new Error('User already exists'), {
                        status: 409,
                        code: 'USER_ALREADY_EXISTS',
                        expose: true,
                    });
                }
                return await prisma.user.create({
                    data: { email, passwordHash },
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    throw Object.assign(new Error('User already exists'), {
                        status: 409,
                        code: 'USER_ALREADY_EXISTS',
                        expose: true,
                    });
                }
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
            if (userId !== requesterId) {
                throw Object.assign(
                    new Error(
                        'You do not have permission to delete this user.'
                    ),
                    {
                        status: 403,
                        code: 'USER_DELETE_FORBIDDEN',
                        expose: true,
                    }
                );
            }
            const ownsTenant = await prisma.tenantMembership.findFirst({
                where: { userId, role: 'owner' },
                select: { tenantId: true },
            });
            if (ownsTenant) {
                throw Object.assign(
                    new Error(
                        'Transfer or delete owned tenants before deleting the user.'
                    ),
                    {
                        status: 409,
                        code: 'USER_OWNS_TENANTS',
                        expose: true,
                    }
                );
            }
            try {
                await prisma.user.delete({ where: { id: userId } });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2025'
                ) {
                    throw Object.assign(new Error('User not found.'), {
                        status: 404,
                        code: 'USER_NOT_FOUND',
                        expose: true,
                    });
                }
                throw error;
            }
        },
        findByEmail: async ({ email }: { email: string }) => {
            return prisma.user.findUnique({ where: { email } });
        },
        findById: async ({ id }: { id: string }) => {
            return prisma.user.findUnique({ where: { id } });
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
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    throw Object.assign(
                        new Error(
                            'A tenant with the same name already exists.'
                        ),
                        {
                            status: 409,
                            code: 'TENANT_NAME_EXISTS',
                            expose: true,
                        }
                    );
                }
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
            const tenantMembership = await prisma.tenantMembership.findUnique({
                where: {
                    tenantId_userId: {
                        tenantId: tenantId,
                        userId: requesterId,
                    },
                },
            });
            if (tenantMembership?.role !== 'owner') {
                throw Object.assign(
                    new Error(
                        'Only the tenant owner can delete the workspace.'
                    ),
                    {
                        status: 403,
                        code: 'TENANT_DELETE_FORBIDDEN',
                        expose: true,
                    }
                );
            }
            try {
                await prisma.tenant.delete({
                    where: { id: tenantId },
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2025'
                ) {
                    throw Object.assign(new Error('Tenant not found.'), {
                        status: 404,
                        code: 'TENANT_NOT_FOUND',
                        expose: true,
                    });
                }
                throw error;
            }
        },
        findById: async (tenantId: string) => {
            return prisma.tenant.findUnique({
                where: {
                    id: tenantId,
                },
            });
        },
        listForUser: async ({
            userId,
        }: {
            userId: string;
        }): Promise<UserTenant[]> => {
            const memberships = await prisma.tenantMembership.findMany({
                where: { userId },
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

            return prisma.document.create({ data });
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
        },
        updateTitle: async (documentId: string, title: string) => {
            return prisma.document.update({
                where: { id: documentId },
                data: { title },
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

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

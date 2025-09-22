import { PrismaClient } from '@prisma/client';

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
            process.env.NODE_ENV === 'development'
                ? ['query', 'error', 'warn']
                : ['error'],
    });

if (process.env.NODE_ENV === 'development') {
    globalForPrisma.prisma = prisma;
}

/** Repository-like helpers so handlers stay clean */
export const db = {
    tenant: {
        getOrCreate: async (name: string) => {
            // placeholder find by name for now; later use slug or id
            const found = await prisma.tenant.findFirst({ where: { name } });
            if (found) return found;
            return prisma.tenant.create({ data: { name } });
        },
    },
    document: {
        create: async (input: {
            tenantId: string;
            title: string;
            source: string;
            mimeType?: string | null;
        }) => {
            return prisma.document.create({ data: input });
        },
        listByTenant: async (tenantId: string, limit = 10, offset = 0) => {
            const [items, total] = await Promise.all([
                prisma.document.findMany({
                    where: { tenantId },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.document.count({ where: { tenantId } }),
            ]);
            return { items, total };
        },
    },
    job: {
        enqueueIndex: async (tenantId: string, documentId: string) => {
            return prisma.indexJob.create({
                data: { tenantId, documentId, status: 'queued' },
            });
        },
    },
};

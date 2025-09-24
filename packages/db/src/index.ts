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
            content?: string | null;
        }) => {
            return prisma.document.create({ data: input });
        },
        getById: async (documentId: string) => {
            return prisma.document.findUnique({ where: { id: documentId } });
        },
        updateTitle: async (documentId: string, title: string) => {
            return prisma.document.update({ where: { id: documentId }, data: { title } });
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

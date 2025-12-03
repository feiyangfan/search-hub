import { prisma } from '../client.js';

export const documentIndexStateRepository = {
    findUnique: async (documentId: string) => {
        return prisma.documentIndexState.findUnique({
            where: {
                documentId,
            },
            select: { lastChecksum: true },
        });
    },

    /**
     * Update or create DocumentIndexState record
     * This should be called even for empty content or unchanged checksums
     * to prevent documents from appearing stale in syncStaleDocuments
     */
    upsert: async (
        documentId: string,
        checksum: string,
        lastIndexedAt: Date
    ) => {
        return prisma.documentIndexState.upsert({
            where: { documentId },
            create: {
                documentId,
                lastChecksum: checksum,
                lastIndexedAt,
            },
            update: {
                lastChecksum: checksum,
                lastIndexedAt,
            },
        });
    },

    /**
     * Get recently indexed documents
     * Returns documents with their index state, ordered by most recent first
     */
    findRecentlyIndexed: async (limit: number, tenantId?: string) => {
        return prisma.documentIndexState.findMany({
            where: tenantId
                ? {
                      document: {
                          tenantId,
                      },
                  }
                : undefined,
            orderBy: {
                lastIndexedAt: 'desc',
            },
            take: limit,
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                        tenantId: true,
                        updatedAt: true,
                    },
                },
            },
        });
    },
};

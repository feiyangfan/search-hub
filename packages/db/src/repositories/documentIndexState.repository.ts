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
};

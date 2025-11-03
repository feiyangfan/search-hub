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
};

import { prisma } from '../client.js';

export const jobRepository = {
    /**
     * API uses this to queue a document for indexing
     * Creates a new job record for audit/history
     */
    enqueueIndex: async (tenantId: string, documentId: string) => {
        return prisma.indexJob.create({
            data: { tenantId, documentId, status: 'queued' },
        });
    },

    /** Worker: queued -> processing (updates most recent queued job) */
    startProcessing: async (tenantId: string, documentId: string) => {
        // Find the most recent queued job for this document
        const job = await prisma.indexJob.findFirst({
            where: { tenantId, documentId, status: 'queued' },
            orderBy: { createdAt: 'desc' },
        });

        if (!job) return 0;

        await prisma.indexJob.update({
            where: { id: job.id },
            data: {
                status: 'processing',
                startedAt: new Date(),
            },
        });
        return 1;
    },

    /** Worker: processing -> indexed */
    markIndexed: async (tenantId: string, documentId: string) => {
        const job = await prisma.indexJob.findFirst({
            where: { tenantId, documentId, status: 'processing' },
            orderBy: { createdAt: 'desc' },
        });

        if (!job) return 0;

        await prisma.indexJob.update({
            where: { id: job.id },
            data: {
                status: 'indexed',
                completedAt: new Date(),
            },
        });
        return 1;
    },

    /** Worker: processing -> failed (records error text) */
    markFailed: async (tenantId: string, documentId: string, error: string) => {
        const job = await prisma.indexJob.findFirst({
            where: { tenantId, documentId, status: 'processing' },
            orderBy: { createdAt: 'desc' },
        });

        if (!job) return 0;

        await prisma.indexJob.update({
            where: { id: job.id },
            data: {
                status: 'failed',
                error,
                completedAt: new Date(),
            },
        });
        return 1;
    },

    /** Find the most recent job for a document */
    findByDocumentId: async (documentId: string) => {
        return prisma.indexJob.findFirst({
            where: { documentId },
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Get only active job statistics (excludes successfully indexed jobs)
     * Use this for dashboard metrics to avoid counting old indexed jobs
     */
    getActiveStatusCounts: async (tenantId: string) => {
        return prisma.indexJob.groupBy({
            by: ['status'],
            _count: true,
            where: {
                tenantId,
                // Only count jobs that represent current work or problems
                status: { in: ['queued', 'processing', 'failed'] },
            },
        });
    },

    /**
     * Clean up old successfully indexed jobs
     * Safe to delete since DocumentIndexState maintains the permanent record
     */
    deleteOldIndexedJobs: async (olderThanDays: number) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.indexJob.deleteMany({
            where: {
                status: 'indexed',
                updatedAt: { lt: cutoffDate },
            },
        });

        return result.count;
    },

    /**
     * Get recent jobs for a tenant across all documents
     * Ordered by most recently updated first
     */
    findRecentJobs: async (tenantId: string, limit = 50) => {
        return prisma.indexJob.findMany({
            where: { tenantId },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            include: {
                document: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    },
};

import { prisma } from '../client.js';

export const jobRepository = {
    /**
     * API uses this to queue a document for indexing
     * If a job already exists, reset it to 'queued' status
     * This allows reindexing of documents
     */
    enqueueIndex: async (tenantId: string, documentId: string) => {
        // Try to find an existing job for this document
        const existingJob = await prisma.indexJob.findFirst({
            where: { tenantId, documentId },
            orderBy: { createdAt: 'desc' },
        });

        if (existingJob) {
            // Reset existing job to queued status
            return prisma.indexJob.update({
                where: { id: existingJob.id },
                data: {
                    status: 'queued',
                    error: null, // Clear any previous error
                },
            });
        }

        // No existing job, create a new one
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
    markFailed: async (tenantId: string, documentId: string, error: string) => {
        const res = await prisma.indexJob.updateMany({
            where: { tenantId, documentId, status: 'processing' },
            data: { status: 'failed', error },
        });
        return res.count;
    },

    /** Find the most recent job for a document */
    findByDocumentId: async (documentId: string) => {
        return prisma.indexJob.findFirst({
            where: { documentId },
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Get job statistics grouped by status for a tenant
     */
    getStatusCounts: async (tenantId: string) => {
        return prisma.indexJob.groupBy({
            by: ['status'],
            _count: true,
            where: { tenantId },
        });
    },
};

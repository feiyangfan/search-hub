import { prisma } from '../client.js';

export interface CreateSearchLogInput {
    tenantId: string;
    userId: string;
    query: string;
    searchType: 'lexical' | 'semantic' | 'hybrid';
    resultCount: number;
    duration: number; // milliseconds
    status: 'success' | 'error' | 'partial';
}

export const searchLogRepository = {
    /**
     * Create a new search log entry
     */
    create: async (input: CreateSearchLogInput) => {
        return await prisma.searchLog.create({
            data: input,
        });
    },

    /**
     * Get search logs by ID
     */
    findById: async (id: string) => {
        return await prisma.searchLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    },

    /**
     * Get recent search logs for a user
     */
    findRecentByUser: async (tenantId: string, userId: string, limit = 20) => {
        return await prisma.searchLog.findMany({
            where: {
                tenantId,
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });
    },

    /**
     * Get search logs within a date range
     */
    findByDateRange: async (
        tenantId: string,
        startDate: Date,
        endDate: Date
    ) => {
        return await prisma.searchLog.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },

    /**
     * Count total searches for a tenant
     */
    countByTenant: async (tenantId: string) => {
        return await prisma.searchLog.count({
            where: { tenantId },
        });
    },

    /**
     * Delete old search logs (for cleanup/retention)
     */
    deleteOlderThan: async (tenantId: string, date: Date) => {
        return await prisma.searchLog.deleteMany({
            where: {
                tenantId,
                createdAt: {
                    lt: date,
                },
            },
        });
    },
};

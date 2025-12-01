import { Router } from 'express';
import { prisma } from '@search-hub/db';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /v1/debug/indexing
 * Returns indexing status for all documents
 * Only available in development mode
 */
router.get('/indexing', async (req, res, next) => {
    try {
        // Only allow in development
        if (env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Debug endpoints not available in production',
            });
        }

        const documents = await prisma.document.findMany({
            select: {
                id: true,
                title: true,
                tenantId: true,
                createdAt: true,
                content: true,
                _count: {
                    select: {
                        chunks: true,
                        jobs: true,
                    },
                },
                indexState: {
                    select: {
                        lastChecksum: true,
                        lastIndexedAt: true,
                    },
                },
                jobs: {
                    select: {
                        id: true,
                        status: true,
                        error: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        const summary = documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            tenantId: doc.tenantId,
            contentLength: doc.content?.length ?? 0,
            chunkCount: doc._count.chunks,
            jobCount: doc._count.jobs,
            lastJobStatus: doc.jobs[0]?.status ?? 'none',
            lastJobError: doc.jobs[0]?.error ?? null,
            lastJobUpdated: doc.jobs[0]?.updatedAt ?? null,
            indexed: !!doc.indexState,
            lastIndexedAt: doc.indexState?.lastIndexedAt ?? null,
            lastChecksum: doc.indexState?.lastChecksum ?? null,
            recentJobs: doc.jobs.map((j) => ({
                id: j.id,
                status: j.status,
                error: j.error,
                createdAt: j.createdAt,
                updatedAt: j.updatedAt,
            })),
        }));

        // Summary statistics
        const stats = {
            total: documents.length,
            indexed: summary.filter((d) => d.indexed).length,
            notIndexed: summary.filter((d) => !d.indexed).length,
            processing: summary.filter((d) => d.lastJobStatus === 'processing')
                .length,
            failed: summary.filter((d) => d.lastJobStatus === 'failed').length,
            totalChunks: summary.reduce((sum, d) => sum + d.chunkCount, 0),
        };

        res.json({
            stats,
            documents: summary,
        });
    } catch (error) {
        next(error);
    }
});

export default router;

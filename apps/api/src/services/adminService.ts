import { db } from '@search-hub/db';
import { indexQueue } from '../queue.js';
import type {
    IndexingStatusResponse,
    IndexingStats,
    WorkerStatus,
    DocumentIndexingDetail,
    ProblemDocuments,
} from '@search-hub/schemas';

/**
 * Get worker status from BullMQ
 */
async function getWorkerStatus(): Promise<WorkerStatus> {
    const [queueCounts, lastCompletedJob] = await Promise.all([
        indexQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        indexQueue.getCompleted(0, 0), // Get most recent completed job
    ]);

    return {
        isHealthy: (queueCounts.active ?? 0) >= 0, // Worker exists if we can query it
        queueDepth: queueCounts.waiting ?? 0,
        activeJobs: queueCounts.active ?? 0,
        maxConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
        lastProcessedAt: lastCompletedJob[0]?.finishedOn
            ? new Date(lastCompletedJob[0].finishedOn).toISOString()
            : null,
    };
}

/**
 * Get lightweight indexing statistics for a tenant
 */
async function getIndexingStats(tenantId: string): Promise<IndexingStats> {
    const [totalDocs, indexedDocs, jobStats, totalChunks, emptyContentCount] =
        await Promise.all([
            db.document.countTotal(tenantId),
            db.document.countIndexed(tenantId),
            db.job.getActiveStatusCounts(tenantId), // Only count queued/processing/failed (not indexed)
            db.document.countChunks(tenantId),
            db.document.countWithContentButNoChunks(tenantId),
        ]);

    return {
        totalDocuments: totalDocs,
        indexed: indexedDocs, // From DocumentIndexState (permanent record)
        queued: jobStats.find((s) => s.status === 'queued')?._count ?? 0,
        processing:
            jobStats.find((s) => s.status === 'processing')?._count ?? 0,
        failed: jobStats.find((s) => s.status === 'failed')?._count ?? 0,
        emptyContent: emptyContentCount,
        totalChunks,
    };
}

/**
 * Get problem documents grouped by issue type for a tenant
 */
async function getProblemDocuments(
    tenantId: string
): Promise<ProblemDocuments> {
    const STUCK_THRESHOLD_MINUTES = 5;
    const stuckThreshold = new Date(
        Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000
    );

    const [failedDocs, stuckDocs, emptyContentDocs] = await Promise.all([
        db.document.findWithFailedJobs(tenantId, 50),
        db.document.findStuckInQueue(tenantId, stuckThreshold, 50),
        db.document.findWithEmptyChunks(tenantId, 50),
    ]);

    // Helper to map document to schema format
    const mapDocument = (
        doc: (typeof failedDocs)[0]
    ): DocumentIndexingDetail => {
        const lastJob = doc.jobs[0];
        return {
            id: doc.id,
            title: doc.title,
            tenantId: doc.tenantId,
            contentLength: doc.content?.length ?? 0,
            chunkCount: doc._count.chunks,
            status: lastJob?.status ?? 'none',
            lastError: lastJob?.error ?? null,
            lastIndexedAt: doc.indexState?.lastIndexedAt?.toISOString() ?? null,
            lastJobUpdatedAt: lastJob?.updatedAt.toISOString() ?? null,
            checksum: doc.indexState?.lastChecksum ?? null,
            recentJobs: doc.jobs.map((j) => ({
                id: j.id,
                status: j.status as
                    | 'queued'
                    | 'processing'
                    | 'indexed'
                    | 'failed',
                error: j.error,
                createdAt: j.createdAt.toISOString(),
                updatedAt: j.updatedAt.toISOString(),
            })),
        };
    };

    return {
        failed: failedDocs.map(mapDocument),
        stuckInQueue: stuckDocs.map(mapDocument),
        emptyContent: emptyContentDocs.map(mapDocument),
    };
}

/**
 * Get recently indexed documents for a tenant
 */
async function getRecentlyIndexedDocuments(
    tenantId: string
): Promise<DocumentIndexingDetail[]> {
    const documents = await db.document.findRecentlyIndexed(tenantId, 10);

    return documents.map((doc) => {
        const lastJob = doc.jobs[0];
        return {
            id: doc.id,
            title: doc.title,
            tenantId: doc.tenantId,
            contentLength: doc.content?.length ?? 0,
            chunkCount: doc._count.chunks,
            status: 'indexed' as const,
            lastError: null,
            lastIndexedAt: doc.indexState?.lastIndexedAt?.toISOString() ?? null,
            lastJobUpdatedAt: lastJob?.updatedAt.toISOString() ?? null,
            checksum: doc.indexState?.lastChecksum ?? null,
            recentJobs: doc.jobs.map((j) => ({
                id: j.id,
                status: j.status as
                    | 'queued'
                    | 'processing'
                    | 'indexed'
                    | 'failed',
                error: j.error,
                createdAt: j.createdAt.toISOString(),
                updatedAt: j.updatedAt.toISOString(),
            })),
        };
    });
}

/**
 * Get full indexing status with problem detection for a tenant
 */
export async function getIndexingStatus(
    tenantId: string,
    options: { includeRecent?: boolean } = {}
): Promise<IndexingStatusResponse> {
    const [stats, worker, problems] = await Promise.all([
        getIndexingStats(tenantId),
        getWorkerStatus(),
        getProblemDocuments(tenantId),
    ]);

    const response: IndexingStatusResponse = {
        stats,
        worker,
        problems,
    };

    if (options.includeRecent) {
        response.recentlyIndexed = await getRecentlyIndexedDocuments(tenantId);
    }

    return response;
}

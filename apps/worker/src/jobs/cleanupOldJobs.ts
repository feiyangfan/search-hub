/**
 * Periodic cleanup job to remove old successfully indexed jobs
 * Runs daily to prevent IndexJob table from growing indefinitely
 *
 * Safe to delete because:
 * - DocumentIndexState maintains the permanent record of indexed documents
 * - Only deletes jobs with status='indexed' (success cases)
 * - Failed jobs are kept for debugging
 */

import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';

const RETENTION_DAYS = 1; // Keep indexed jobs for 1 day

/**
 * Clean up old successfully indexed jobs
 */
export async function cleanupOldJobs(): Promise<{
    deleted: number;
}> {
    const startTime = Date.now();

    const logger = baseLogger.child({
        component: 'cleanup-old-jobs',
    });

    try {
        const deletedCount = await db.job.deleteOldIndexedJobs(RETENTION_DAYS);

        const duration = Date.now() - startTime;
        logger.info(
            {
                deleted: deletedCount,
                retentionDays: RETENTION_DAYS,
                durationMs: duration,
            },
            'cleanup.completed'
        );

        return { deleted: deletedCount };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
                durationMs: duration,
            },
            'cleanup.failed'
        );
        throw error;
    }
}

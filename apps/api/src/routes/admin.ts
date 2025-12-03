/**
 * Admin endpoints for operational monitoring and management
 *
 * TODO: Add role-based access control (owner/admin only)
 * Currently requires authentication but no role check
 */
import { Router } from 'express';
import { getIndexingStatus, getQueueStatus } from '../services/adminService.js';
import { validateQuery } from '../middleware/validateMiddleware.js';
import {
    IndexingStatusQuerySchema,
    QueueStatusQuerySchema,
} from '@search-hub/schemas';
import { indexQueue } from '../queue.js';

const router = Router();

/**
 * GET /v1/admin/indexing
 * Query params:
 *   - includeRecent: 'true' - Include list of recently indexed documents
 * Returns indexing status with stats, worker health, and problem documents
 */
router.get(
    '/indexing',
    validateQuery(IndexingStatusQuerySchema),
    async (req, res, next) => {
        try {
            const tenantId = req.session.currentTenantId;
            if (!tenantId) {
                return res.status(400).json({ error: 'No tenant selected' });
            }

            const includeRecent = req.query.includeRecent === 'true';
            const response = await getIndexingStatus(tenantId, {
                includeRecent,
            });
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /v1/admin/queue
 * Query params:
 *   - limit: number (optional, default 50, max 200)
 *   - includeRecent: 'true' - Include recently indexed documents from DB
 * Returns BullMQ queue state for debugging
 */
router.get(
    '/queue',
    validateQuery(QueueStatusQuerySchema),
    async (req, res, next) => {
        try {
            const limit = Number(req.query.limit) || 50;
            const includeRecent = req.query.includeRecent === 'true';
            const tenantId = req.session.currentTenantId;

            const response = await getQueueStatus({
                limit,
                includeRecent,
                tenantId,
            });

            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /v1/admin/queue/clean
 * Query params:
 *   - status: 'completed' | 'failed' (required) - Type of jobs to clean
 *   - grace: number (optional, default 0) - Grace period in seconds (0 = all)
 * Cleans old jobs from the BullMQ queue
 * DEV/TEST ONLY - removes completed/failed jobs from queue history
 */
router.post('/queue/clean', async (req, res, next) => {
    try {
        const status = req.query.status as string;
        const grace = Number(req.query.grace) || 0;

        if (!status || !['completed', 'failed'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be "completed" or "failed"',
            });
        }

        // Clean jobs: grace period in milliseconds, limit 1000 per batch
        const graceMs = grace * 1000;
        const removedJobs = await indexQueue.clean(
            graceMs,
            1000,
            status as 'completed' | 'failed'
        );

        res.json({
            success: true,
            removed: removedJobs.length,
            status,
            gracePeriodSeconds: grace,
        });
    } catch (error) {
        next(error);
    }
});

export default router;

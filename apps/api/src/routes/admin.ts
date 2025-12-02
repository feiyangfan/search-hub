/**
 * Admin endpoints for operational monitoring and management
 *
 * TODO: Add role-based access control (owner/admin only)
 * Currently requires authentication but no role check
 */
import { Router } from 'express';
import { getIndexingStatus } from '../services/adminService.js';
import { validateQuery } from '../middleware/validateMiddleware.js';
import { IndexingStatusQuerySchema } from '@search-hub/schemas';

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

export default router;

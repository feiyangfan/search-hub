import { Router } from 'express';
import { env } from '../../config/env.js';
import { metrics } from '@search-hub/observability';

export function signOutRoutes() {
    const router = Router();
    router.post('/', (req, res, next) => {
        // Get tenant_id before destroying session
        const tenantId = req.session.currentTenantId;

        req.session.destroy((err) => {
            if (err) {
                next(err);
                return;
            }

            // Decrement active users count
            if (tenantId) {
                metrics.activeUsers.dec({
                    tenant_id: tenantId,
                });
            }

            res.clearCookie('connect.sid', {
                httpOnly: true,
                sameSite: 'lax',
                secure: env.NODE_ENV === 'production',
            });
            res.status(204).end();
        });
    });

    return router;
}

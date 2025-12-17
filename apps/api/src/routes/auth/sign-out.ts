import { Router } from 'express';
import { env } from '../../config/env.js';
import { metrics } from '@search-hub/observability';
import { logger as baseLogger } from '../../logger.js';

const logger = baseLogger.child({ component: 'sign-out' });

export function signOutRoutes() {
    const router = Router();
    router.post('/', (req, res, next) => {
        // Get tenant_id before destroying session
        const tenantId = req.session.currentTenantId;
        const userId = req.session.userId;
        const email = req.session.email;

        logger.info(
            {
                userId,
                email,
                tenantId,
            },
            'sign_out.success'
        );

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

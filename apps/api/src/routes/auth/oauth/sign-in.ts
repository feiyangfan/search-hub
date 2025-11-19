import { Router } from 'express';
import { metrics } from '@search-hub/observability';
import {
    OAuthSignInPayload,
    OAuthSignInResponse,
} from '@search-hub/schemas';

import { validateBody } from '../../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../../types.js';
import { db } from '@search-hub/db';

export function oauthSignInRoutes() {
    const router = Router();

    router.post(
        '/',
        validateBody(OAuthSignInPayload),
        async (req, res, next) => {
            try {
                const typedReq =
                    req as RequestWithValidatedBody<OAuthSignInPayload>;
                const { email, name, provider, providerAccountId } =
                    typedReq.validated.body;

                const userRecord = await db.user.upsertOAuthUser({
                    email,
                    name,
                    provider,
                    providerAccountId,
                });

                const userTenants = await db.tenant.listForUser({
                    userId: userRecord.id,
                });
                const memberships = userTenants;
                const primaryTenantId = memberships[0]?.tenantId ?? null;

                req.session.regenerate((err) => {
                    if (err) {
                        next(err);
                        return;
                    }

                    req.session.userId = userRecord.id;
                    req.session.email = userRecord.email;
                    req.session.name = userRecord.name ?? undefined;
                    req.session.memberships = memberships;
                    req.session.currentTenantId = primaryTenantId ?? undefined;

                    req.session.save((err) => {
                        if (err) return next(err);

                        metrics.authAttempts.inc({
                            method: 'oauth',
                            status: 'success',
                        });

                        if (primaryTenantId) {
                            metrics.activeUsers.inc({
                                tenant_id: primaryTenantId,
                            });
                        }

                        res.status(200).json(
                            OAuthSignInResponse.parse({
                                user: {
                                    id: userRecord.id,
                                    email: userRecord.email,
                                    name: userRecord.name,
                                    memberships,
                                },
                                session: {
                                    currentTenantId: primaryTenantId,
                                },
                            })
                        );
                    });
                });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

import { Router } from 'express';
import { metrics } from '@search-hub/observability';
import { OAuthSignInPayload, OAuthSignInResponse } from '@search-hub/schemas';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env.js';

import { validateBody } from '../../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../../types.js';
import { db } from '@search-hub/db';

const googleClient = new OAuth2Client();

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;

export function oauthSignInRoutes() {
    const router = Router();

    router.post(
        '/',
        validateBody(OAuthSignInPayload),
        async (req, res, next) => {
            try {
                const typedReq =
                    req as RequestWithValidatedBody<OAuthSignInPayload>;
                const { provider, idToken } = typedReq.validated.body;

                const ticket = await googleClient.verifyIdToken({
                    idToken,
                    audience: GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();

                if (!payload) {
                    throw new Error('Invalid ID token payload');
                }
                const userid = payload['sub'];

                if (payload.email_verified === false) {
                    throw new Error('Email not verified by OAuth provider');
                }

                if (payload.email === undefined) {
                    throw new Error('Email not provided by OAuth provider');
                }

                const userRecord = await db.user.upsertOAuthUser({
                    email: payload.email,
                    name: payload.name || undefined,
                    provider,
                    providerAccountId: userid,
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

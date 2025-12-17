import { Router } from 'express';
import { metrics } from '@search-hub/observability';
import { OAuthSignInPayload, OAuthSignInResponse } from '@search-hub/schemas';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env.js';

import { validateBody } from '../../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../../types.js';
import { db } from '@search-hub/db';

import { logger as baseLogger } from '../../../logger.js';

const logger = baseLogger.child({ component: 'oauth-sign-in-routes' });

import { AppError } from '@search-hub/schemas';

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
                    metrics.authAttempts.inc({
                        method: 'oauth',
                        status: 'failed',
                    });
                    throw AppError.authentication(
                        'OAUTH_INVALID_TOKEN',
                        'Invalid OAuth token payload',
                        {
                            context: {
                                origin: 'server',
                                domain: 'auth',
                                operation: 'oauth-sign-in',
                                metadata: { provider },
                            },
                        }
                    );
                }
                const userid = payload['sub'];

                if (payload.email_verified === false) {
                    metrics.authAttempts.inc({
                        method: 'oauth',
                        status: 'failed',
                    });
                    throw AppError.authentication(
                        'OAUTH_EMAIL_NOT_VERIFIED',
                        'Email not verified by OAuth provider',
                        {
                            context: {
                                origin: 'server',
                                domain: 'auth',
                                operation: 'oauth-sign-in',
                                metadata: { provider, email: payload.email },
                            },
                        }
                    );
                }

                if (payload.email === undefined) {
                    metrics.authAttempts.inc({
                        method: 'oauth',
                        status: 'failed',
                    });
                    throw AppError.authentication(
                        'OAUTH_EMAIL_MISSING',
                        'Email not provided by OAuth provider',
                        {
                            context: {
                                origin: 'server',
                                domain: 'auth',
                                operation: 'oauth-sign-in',
                                metadata: { provider },
                            },
                        }
                    );
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

                        logger.info(
                            {
                                userId: userRecord.id,
                                email: userRecord.email,
                                provider,
                                tenantId: primaryTenantId,
                            },
                            'sign_in.success'
                        );

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

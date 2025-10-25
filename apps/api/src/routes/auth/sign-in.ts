import { Router } from 'express';

import {
    AuthPayload,
    UserProfileWithSummary,
    AuthenticationError,
} from '@search-hub/schemas';
import type { AuthPayload as AuthPayloadType } from '@search-hub/schemas';

import { validateBody } from '../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../types.js';

import { db } from '@search-hub/db';
import bcrypt from 'bcrypt';

export function signInRoutes() {
    const router = Router();

    router.post('/', validateBody(AuthPayload), async (req, res, next) => {
        try {
            const typedReq = req as RequestWithValidatedBody<AuthPayloadType>;
            const { email, password } = typedReq.validated.body;

            const userRecord = await db.user.findByEmail({ email });

            if (!userRecord || !userRecord.passwordHash) {
                throw new AuthenticationError('Invalid email or password');
            }

            const isPasswordValid = await bcrypt.compare(
                password,
                userRecord.passwordHash
            );

            if (!isPasswordValid) {
                throw new AuthenticationError('Invalid email or password');
            }

            const userTenants = await db.tenant.listForUser({
                userId: userRecord.id,
            });

            const memberships = userTenants;
            const primaryTenantId = memberships[0]?.tenantId ?? null;

            req.session.regenerate(function (err) {
                if (err) {
                    next(err);
                    return;
                }
                req.session.userId = userRecord.id;
                req.session.email = userRecord.email;
                req.session.memberships = memberships;
                req.session.currentTenantId = primaryTenantId ?? undefined;

                req.session.save((err) => {
                    if (err) return next(err);
                    res.status(200).json({
                        user: UserProfileWithSummary.parse({
                            id: userRecord.id,
                            email: userRecord.email,
                            memberships: memberships,
                        }),
                        message: 'User signed in',
                        session: {
                            currentTenantId: primaryTenantId,
                        },
                    });
                });
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

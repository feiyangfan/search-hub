import { Router } from 'express';

import { AuthPayload, UserProfileWithSummary } from '@search-hub/schemas';
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

            const userRecord = await db.user.findByEmailWithTenants({ email });

            if (!userRecord || !userRecord.passwordHash) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_EMAIL_OR_PASSWORD',
                        message: 'Invalid email or password',
                    },
                });
            }

            const isPasswordValid = await bcrypt.compare(
                password,
                userRecord.passwordHash
            );

            if (!isPasswordValid) {
                return res.status(401).json({
                    error: {
                        code: 'INVALID_EMAIL_OR_PASSWORD',
                        message: 'Invalid email or password',
                    },
                });
            }

            const membershipSummaries = userRecord.memberships.map((m) => ({
                tenantName: m.tenant?.name ?? 'Workspace',
                role: m.role,
            }));

            const memberships = userRecord.memberships.map((m) => ({
                tenantId: m.tenant?.id,
                tenantName: m.tenant?.name,
                role: m.role,
            }));

            req.session.regenerate(function (err) {
                if (err) {
                    next(err);
                    return;
                }
                req.session.userId = userRecord.id;
                req.session.email = userRecord.email;
                req.session.memberships = memberships;

                req.session.save((err) => {
                    if (err) return next(err);
                    res.status(200).json({
                        user: UserProfileWithSummary.parse({
                            id: userRecord.id,
                            email: userRecord.email,
                            memberships: membershipSummaries,
                        }),
                        message: 'User signed in',
                    });
                });
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

import { Router } from 'express';
import {
    AuthPayload,
    UserProfile,
    ValidationError,
    DatabaseError,
} from '@search-hub/schemas';
import type { AuthPayload as AuthPayloadType } from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';

import { validateBody } from '../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../types.js';

import { db } from '@search-hub/db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function signUpRoutes() {
    const router = Router();

    router.post('/', validateBody(AuthPayload), async (req, res, next) => {
        try {
            const typedReq = req as RequestWithValidatedBody<AuthPayloadType>;
            const { email, password } = typedReq.validated.body;

            console.log('Sign-up attempt for email:', email);

            // Optimistic check - catches most duplicate attempts early
            const existingUser = await db.user.findByEmail({ email });
            if (existingUser) {
                // Track failed sign-up (duplicate email)
                metrics.authAttempts.inc({
                    method: 'sign-up',
                    status: 'failure',
                });
                throw new ValidationError(
                    'User with this email already exists',
                    'email'
                );
            }

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            try {
                const user = await db.user.create({ email, passwordHash });

                // Track successful sign-up
                metrics.authAttempts.inc({
                    method: 'sign-up',
                    status: 'success',
                });
                metrics.userSignUps.inc({ source: 'web' });

                res.status(201).json({
                    user: UserProfile.parse(user),
                    message: 'User created',
                });
            } catch (dbError: unknown) {
                // Handle race condition - database constraint violation
                if (
                    dbError &&
                    typeof dbError === 'object' &&
                    'code' in dbError &&
                    dbError.code === 'P2002' &&
                    'meta' in dbError &&
                    dbError.meta &&
                    typeof dbError.meta === 'object' &&
                    'target' in dbError.meta &&
                    Array.isArray(dbError.meta.target) &&
                    dbError.meta.target.includes('email')
                ) {
                    // Prisma unique constraint error for email field
                    // Track failed sign-up (race condition duplicate)
                    metrics.authAttempts.inc({
                        method: 'sign-up',
                        status: 'failure',
                    });
                    throw new ValidationError(
                        'User with this email already exists',
                        'email'
                    );
                }

                // Re-throw other database errors as DatabaseError
                const errorMessage =
                    dbError instanceof Error
                        ? dbError.message
                        : 'Unknown database error';
                const errorCode =
                    dbError && typeof dbError === 'object' && 'code' in dbError
                        ? String(dbError.code)
                        : 'UNKNOWN';

                throw new DatabaseError(
                    `Failed to create user: ${errorMessage}`,
                    'user_creation',
                    { originalError: errorCode }
                );
            }
        } catch (error) {
            next(error);
        }
    });

    return router;
}

import { Router } from 'express';
import {
    UserProfile,
    AppError,
    registrationPayload,
} from '@search-hub/schemas';
import { type RegistrationPayload } from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';

import { validateBody } from '../../middleware/validateMiddleware.js';
import type { RequestWithValidatedBody } from '../types.js';

import { db } from '@search-hub/db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function signUpRoutes() {
    const router = Router();

    router.post(
        '/',
        validateBody(registrationPayload),
        async (req, res, next) => {
            try {
                const typedReq =
                    req as RequestWithValidatedBody<RegistrationPayload>;
                const { email, name, password } = typedReq.validated.body;

                // Optimistic check - catches most duplicate attempts early
                const existingUser = await db.user.findByEmail({ email });
                if (existingUser) {
                    // Track failed sign-up (duplicate email)
                    metrics.authAttempts.inc({
                        method: 'sign-up',
                        status: 'failure',
                    });
                    throw AppError.conflict(
                        'USER_ALREADY_EXISTS',
                        'User with this email already exists',
                        {
                            context: {
                                origin: 'server',
                                domain: 'auth',
                                operation: 'sign-up',
                                metadata: { field: 'email' },
                            },
                        }
                    );
                }

                const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

                try {
                    const user = await db.user.create({
                        email,
                        name,
                        passwordHash,
                    });

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
                        throw AppError.conflict(
                            'USER_ALREADY_EXISTS',
                            'User with this email already exists',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'auth',
                                    operation: 'sign-up',
                                    metadata: {
                                        field: 'email',
                                        reason: 'race_condition',
                                    },
                                },
                            }
                        );
                    }

                    // Re-throw other database errors as internal error
                    const errorMessage =
                        dbError instanceof Error
                            ? dbError.message
                            : 'Unknown database error';
                    const errorCode =
                        dbError &&
                        typeof dbError === 'object' &&
                        'code' in dbError
                            ? String(dbError.code)
                            : 'UNKNOWN';

                    throw AppError.internal(
                        'USER_CREATION_FAILED',
                        `Failed to create user: ${errorMessage}`,
                        {
                            context: {
                                origin: 'database',
                                domain: 'auth',
                                operation: 'sign-up',
                                metadata: { originalError: errorCode },
                            },
                        }
                    );
                }
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

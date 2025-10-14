import { Router } from 'express';
import { AuthPayload, UserProfile } from '@search-hub/schemas';
import type { AuthPayload as AuthPayloadType } from '@search-hub/schemas';

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

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const user = await db.user.create({ email, passwordHash });

            res.status(201).json({
                user: UserProfile.parse(user),
                message: 'User created',
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}

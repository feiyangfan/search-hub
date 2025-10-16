import { z } from 'zod';
import { Id } from './common.js';
import { UserProfileWithSummary } from './user';

export const AuthPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type AuthPayload = z.infer<typeof AuthPayload>;

export const AuthResponse = z.object({
    user: UserProfileWithSummary,
    message: z.string(),
    session: z
        .object({
            currentTenantId: Id.nullable().optional(),
        })
        .optional(),
});

export type AuthResponse = z.infer<typeof AuthResponse>;

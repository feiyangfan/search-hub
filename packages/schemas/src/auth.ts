import { z } from 'zod';
import { Id } from './common.js';
import { UserProfileWithSummary } from './user.js';

export const registrationPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().min(1).max(80),
});

export type RegistrationPayload = z.infer<typeof registrationPayload>;

export const AuthPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type AuthPayload = z.infer<typeof AuthPayload>;

export const OAuthSignInPayload = z.object({
    provider: z.literal('google'), // enum for future providers
    providerAccountId: z.string(),
    email: z.email(),
    name: z.string().min(1).max(80),
});

export type OAuthSignInPayload = z.infer<typeof OAuthSignInPayload>;

export const OAuthSignInResponse = z.object({
    user: UserProfileWithSummary,
    session: z
        .object({
            currentTenantId: Id.nullable().optional(),
        })
        .optional(),
});

export type OAuthSignInResponse = z.infer<typeof OAuthSignInResponse>;

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

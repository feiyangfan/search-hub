import { z } from 'zod';
import { UserProfile } from './user';

export const AuthPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type AuthPayload = z.infer<typeof AuthPayload>;

export const SignUpResponse = z.object({
    user: UserProfile,
    message: z.string(),
});

export type SignUpResponse = z.infer<typeof SignUpResponse>;

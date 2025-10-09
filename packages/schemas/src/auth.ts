import { z } from 'zod';
import { UserProfile } from './user';

export const SignUpPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type SignUpPayload = z.infer<typeof SignUpPayload>;

export const SignUpResponse = z.object({
    user: UserProfile,
    message: z.string(),
});

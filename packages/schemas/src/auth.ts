import { z } from 'zod';

export const SignUpPayload = z.object({
    email: z.email(),
    password: z.string().min(8),
});

export type SignUpPayload = z.infer<typeof SignUpPayload>;

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    // compact, readable output in CI/dev
    console.error('Invalid environment configuration:');
    console.error(parsed.error);
    process.exit(1);
}

export const env = parsed.data;

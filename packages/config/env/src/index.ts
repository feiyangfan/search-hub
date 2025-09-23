import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

const ServerEnvSchema = z.object({
    BASE_URL: z.url().default('http://localhost:3000'),
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function loadServerEnv(): ServerEnv {
    const parsed = ServerEnvSchema.safeParse(process.env);
    if (!parsed.success) {
        // compact, readable output in CI/dev
        console.error('[env] Invalid environment configuration:');
        console.error(parsed.error);
        process.exit(1);
    }

    return parsed.data;
}

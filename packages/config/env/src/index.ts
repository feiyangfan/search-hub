import dotenv from 'dotenv';
import { z } from 'zod';

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

const AiEnvSchema = z.object({
    VOYAGE_API_KEY: z.string(),
});

export type AiEnv = z.infer<typeof AiEnvSchema>;

const DbEnvSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
});

export type DbEnv = z.infer<typeof DbEnvSchema>;

const WorkerEnvSchema = z.object({
    REDIS_URL: z.url(),
    WORKER_CONCURRENCY: z.coerce.number().min(1),
    WORKER_MAX_CHUNK_LIMIT: z.coerce.number().min(1),

    VOYAGE_API_KEY: z.string(),
});

export type WorkerEnv = z.infer<typeof WorkerEnvSchema>;

function loadEnv<T>(schema: z.ZodType<T>, options?: { path?: string }) {
    if (options?.path) {
        dotenv.config(
            options?.path
                ? { path: options.path, quiet: true }
                : { quiet: true }
        );
    } else {
        dotenv.config({ quiet: true });
    }

    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
        console.error('[env] Invalid configuration', parsed.error);
        process.exit(1);
    }
    return parsed.data;
}

export const loadServerEnv = (opts?: { path?: string }) =>
    loadEnv(ServerEnvSchema, opts);

export const loadAiEnv = (opts?: { path?: string }) =>
    loadEnv(AiEnvSchema, opts);

export const loadDbEnv = (opts?: { path?: string }) =>
    loadEnv(DbEnvSchema, opts);

export const loadWorkerEnv = (opts?: { path?: string }) => {
    loadEnv(WorkerEnvSchema, opts);
};

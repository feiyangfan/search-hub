import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'ifno', 'debug', 'trace'])
        .optional(),
});

export const env = EnvSchema.parse(process.env);

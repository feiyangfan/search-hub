import { PrismaClient } from '@prisma/client';
import { loadDbEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';

const env: ReturnType<typeof loadDbEnv> = loadDbEnv();

/**
 * Create a single PrismaClient instance.
 * In dev, Next/tsx hot reload can instantiate multiple times — guard with global.
 * Ref: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

if (env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = basePrismaClient;
}

/**
 * Extended Prisma client with query duration tracking and error metrics.
 * Note: Prisma extension API returns 'any' types - this is expected and safe
 */
export const prisma = basePrismaClient.$extends({
    query: {
        $allOperations: async ({ operation, model, args, query }) => {
            const startTime = Date.now();

            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const result = await query(args);
                const duration = (Date.now() - startTime) / 1000; // Convert to seconds

                // Track successful query duration
                metrics.dbQueryDuration.observe(
                    {
                        operation, // findMany, create, update, delete, etc.
                        table: model || 'unknown', // User, Document, Tenant, etc.
                    },
                    duration
                );

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return result;
            } catch (error) {
                // Track failed query duration too (important for slow failing queries)
                const duration = (Date.now() - startTime) / 1000;

                metrics.dbQueryDuration.observe(
                    {
                        operation,
                        table: model || 'unknown',
                    },
                    duration
                );

                // Track database errors
                metrics.dbErrors.inc({
                    tenant_id: 'unknown', // Context doesn't have tenant_id here
                    operation,
                });

                throw error;
            }
        },
    },
});

// Re-export PrismaClient type for convenience
export type { PrismaClient } from '@prisma/client';

import type { Redis } from 'ioredis'; // For the rate limiter
import type { RedisClientType } from 'redis'; // For the session store

// Use an interface that accepts any Prisma client (base or extended)
// This is more flexible and works with Prisma's $extends API
interface PrismaLike {
    $queryRaw: <T = unknown>(
        query: TemplateStringsArray,
        ...values: unknown[]
    ) => Promise<T>;
}

// 1. Define dependencies with their correct, distinct types.
export interface HealthCheckDependencies {
    db: PrismaLike;
    rateLimitRedis: Redis;
    sessionRedis: RedisClientType;
}

// 2. The status report structure remains the same.
export interface HealthStatus {
    status: 'ok' | 'error';
    timestamp: string;
    services: {
        database: {
            status: 'ok' | 'error';
            message?: string;
        };
        rateLimitCache: {
            status: 'ok' | 'error';
            message?: string;
        };
        sessionCache: {
            status: 'ok' | 'error';
            message?: string;
        };
    };
}

// 3. The health checker function now handles both client types.
export function createHealthChecker(deps: HealthCheckDependencies) {
    return async (): Promise<HealthStatus> => {
        // Use Promise.allSettled to check all services in parallel without failing early.
        const [dbStatus, rateLimitRedisStatus, sessionRedisStatus] =
            await Promise.allSettled([
                // Check Database
                deps.db.$queryRaw`SELECT 1`,
                // Check Rate Limit Redis (ioredis client)
                deps.rateLimitRedis.ping(),
                // Check Session Redis (redis client)
                deps.sessionRedis.ping(),
            ]);

        const services: HealthStatus['services'] = {
            database: {
                status: dbStatus.status === 'fulfilled' ? 'ok' : 'error',
                message:
                    dbStatus.status === 'rejected'
                        ? (dbStatus.reason as Error).message
                        : undefined,
            },
            rateLimitCache: {
                status:
                    rateLimitRedisStatus.status === 'fulfilled' &&
                    rateLimitRedisStatus.value === 'PONG'
                        ? 'ok'
                        : 'error',
                message:
                    rateLimitRedisStatus.status === 'rejected'
                        ? (rateLimitRedisStatus.reason as Error).message
                        : rateLimitRedisStatus.value !== 'PONG'
                        ? `Unexpected response: ${String(
                              rateLimitRedisStatus.value
                          )}`
                        : undefined,
            },
            sessionCache: {
                status:
                    sessionRedisStatus.status === 'fulfilled' &&
                    sessionRedisStatus.value === 'PONG'
                        ? 'ok'
                        : 'error',
                message:
                    sessionRedisStatus.status === 'rejected'
                        ? (sessionRedisStatus.reason as Error).message
                        : sessionRedisStatus.value !== 'PONG'
                        ? `Unexpected response: ${sessionRedisStatus.value}`
                        : undefined,
            },
        };

        // The overall status is 'error' if any single service has failed.
        const overallStatus = Object.values(services).every(
            (s) => s.status === 'ok'
        )
            ? 'ok'
            : 'error';

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            services,
        };
    };
}

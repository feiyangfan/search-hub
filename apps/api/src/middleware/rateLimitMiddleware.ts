import { env } from '../config/env.js';
import type { RequestHandler } from 'express';
import { Redis } from 'ioredis';
import { logger as baseLogger } from '../logger.js';

const logger = baseLogger.child({ component: 'rate-limiter' });

const { REDIS_URL, API_RATE_LIMIT_WINDOW_MS, API_RATE_LIMIT_MAX } = env;
declare global {
    var __redis__: Redis | undefined;
}

export const redisClient = globalThis.__redis__ ?? new Redis(REDIS_URL);

if (env.NODE_ENV !== 'production') {
    globalThis.__redis__ = redisClient;
}

export function createRateLimiter(opts?: {
    windowMs?: number;
    max?: number;
    prefix?: string;
}): RequestHandler {
    const windowMs = opts?.windowMs ?? API_RATE_LIMIT_WINDOW_MS;
    const max = opts?.max ?? API_RATE_LIMIT_MAX;
    const prefix = opts?.prefix ?? 'rate';

    const script = `
    local key    = KEYS[1]
    local max    = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now    = tonumber(ARGV[3])

    local bucket = redis.call("HMGET", key, "tokens", "refill_at")
    local tokens = tonumber(bucket[1]) or max
    local refill = tonumber(bucket[2]) or now

    if now >= refill then
      tokens = max
      refill = now + window
    end

    if tokens <= 0 then
      redis.call("HMSET", key, "tokens", tokens, "refill_at", refill)
      redis.call("PEXPIRE", key, window)
      return -1
    end

    tokens = tokens - 1
    redis.call("HMSET", key, "tokens", tokens, "refill_at", refill)
    redis.call("PEXPIRE", key, window)
    return tokens
  `;

    return async function rateLimitMiddleware(req, res, next) {
        const key = `${prefix}:${req.ip}`;
        const now = Date.now();

        try {
            const raws = await redisClient.eval(
                script,
                1,
                key,
                max,
                windowMs,
                now
            );
            const tokens = Number(raws);
            // Debug logging (useful for troubleshooting rate limit issues)
            if (env.LOG_LEVEL === 'debug') {
                const snapshot = await redisClient.hmget(
                    key,
                    'tokens',
                    'refill_at'
                );
                logger.debug(
                    {
                        key,
                        tokens: snapshot[0],
                        refillAt: snapshot[1],
                        prefix,
                        ip: req.ip,
                    },
                    'bucket.state'
                );
            }

            if (tokens < 0) {
                logger.warn(
                    {
                        ip: req.ip,
                        prefix,
                        path: req.path,
                        method: req.method,
                        userAgent: req.headers['user-agent'],
                        max,
                        windowMs,
                    },
                    'limit.exceeded'
                );
                return res.status(429).json({
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Too many requests. Try again soon.',
                    },
                });
            }
            next();
        } catch (error) {
            logger.error(
                {
                    error,
                    key,
                    prefix,
                    ip: req.ip,
                },
                'redis.error'
            );
            next(error);
        }
    };
}

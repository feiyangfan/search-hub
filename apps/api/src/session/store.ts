import { logger as baseLogger } from '../logger.js';

import { createClient, RedisClientType } from 'redis';
import { RedisStore } from 'connect-redis';

import { env } from '../config/env.js';

const logger = baseLogger.child({ component: 'session-store' });

export const redisClient: RedisClientType = createClient({
    url: env.REDIS_URL,
});
redisClient.on('error', (err: Error) => logger.error({ err }, 'redis.error'));
export const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'myapp:',
});

export async function initSessionStore() {
    try {
        await redisClient.connect();
        logger.info('connection.established');
    } catch (error) {
        logger.error({ error }, 'connection.failed');
        throw error; // Re-throw to fail bootstrap
    }
}

export async function closeSessionStore() {
    try {
        await redisClient.quit();
        logger.info('disconnection.completed');
    } catch (error) {
        logger.error({ error }, 'disconnection.failed');
        throw error;
    }
}

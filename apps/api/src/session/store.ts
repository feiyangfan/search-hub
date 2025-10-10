import { logger } from '@search-hub/logger';

import { createClient, RedisClientType } from 'redis';
import { RedisStore } from 'connect-redis';

export const redisClient: RedisClientType = createClient({
    url: process.env.REDIS_URL,
});
redisClient.on('error', (err: Error) =>
    logger.error(
        {
            err,
        },
        'redis error'
    )
);
export const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'myapp:',
});

export async function initSessionStore() {
    try {
        await redisClient.connect();
    } catch (error) {
        logger.error({ error }, 'redis-connection-error');
    }
}

export async function closeSessionStore() {
    try {
        await redisClient.quit();
    } catch (error) {
        logger.error({ error }, 'redis-connection-error');
    }
}

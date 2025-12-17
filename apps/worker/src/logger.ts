import { createLogger } from '@search-hub/logger';
import { loadWorkerEnv } from '@search-hub/config-env';

const env = loadWorkerEnv();

export const logger = createLogger({
    service: 'worker',
    env: env.NODE_ENV,
    level: env.LOG_LEVEL,
});

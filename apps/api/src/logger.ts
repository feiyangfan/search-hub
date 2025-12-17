import { createLogger } from '@search-hub/logger';

import { env } from './config/env.js';

export const logger = createLogger({
    service: 'api',
    env: env.NODE_ENV,
    level: env.LOG_LEVEL,
});

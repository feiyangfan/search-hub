import { createLogger } from './createLogger.js';

export { createLogger };

export * from './correlation.js';

export const logger = createLogger('api');
export const dbLogger = logger.child({ component: 'db' });
export const authLogger = logger.child({ component: 'auth' });
export { httpLogger } from './httplogger.js';

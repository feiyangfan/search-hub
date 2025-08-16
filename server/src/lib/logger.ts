import pino from 'pino';
import { env } from '../config/env.js';

const isProd = env.NODE_ENV === 'production';
const level = env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

// Pretty-print
const transport = isProd
    ? undefined
    : ({
          target: 'pino-pretty',
          options: {
              colorize: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname',
          },
      } as const);

// Export the actual customized logger
export const logger = pino({
    name: 'Server',
    level,
    serializers: pino.stdSerializers,
    // redaction
    redact: {
        paths: [
            'password',
            'pass',
            'user.password',
            'headers.authorization',
            'headers.cookie',
            'config.database.password',
            'config.redis.password',
            'secret',
            'secrets[*]',
            'token',
            'accessToken',
            'refreshToken',
        ],
        censor: '**Redacted**',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return {
                level: label,
            };
        },
    },
    ...(transport ? { transport } : {}),
});

export const httpLogger = logger.child({ component: 'http' });
export const dbLogger = logger.child({ component: 'db' });
export const authLogger = logger.child({ component: 'auth' });

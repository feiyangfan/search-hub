import pino from 'pino';
import { loadServerEnv } from '@search-hub/config-env';

export function createLogger(service = 'api') {
    const env = loadServerEnv();
    const isProd = env.NODE_ENV === 'production';
    const level = env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

    const transport =
        !isProd && process.stdout.isTTY
            ? {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'HH:MM:ss.l',
                      ignore: 'pid,hostname',
                  },
              }
            : undefined;

    return pino({
        name: service,
        level,
        base: undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
        redact: {
            paths: [
                'password',
                'pass',
                'user.password',
                // http redactions (align with pino-http fields)
                'req.headers.authorization',
                'req.headers.cookie',
                "res.headers['set-cookie']",
                // common secret-ish fields
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
        formatters: {
            level(label) {
                return { level: label };
            },
            bindings(b) {
                return { ...b, service };
            }, // keep service name on every line
        },
        ...(transport ? { transport } : {}),
    });
}

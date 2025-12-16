import pino from 'pino';

import { getRequestContext } from './correlation.js';

// Add context mixin to automatically include traceId and other context info
const defaultContextMixin = () => {
    const context = getRequestContext();
    return context
        ? {
              traceId: context.traceId,
              userId: context.userId,
              tenantId: context.tenantId,
              sessionId: context.sessionId,
          }
        : {};
};

const defaultRedact = [
    'password',
    'pass',
    'user.password',
    'req.headers.authorization',
    'req.headers.cookie',
    "res.headers['set-cookie']",
    'config.database.password',
    'config.redis.password',
    'secret',
    'secrets[*]',
    'token',
    'accessToken',
    'refreshToken',
    'id_token',
    'idToken',
];

export function createLogger(options: {
    service: string;
    env?: string; // e.g., 'production' or 'development'
    level?: string;
    base?: Record<string, unknown>; // additional base fields to include
    redactPaths?: string[]; // additional paths to redact
    pretty?: boolean; // pretty print logs (for non-production)
    contextMixin?: () => Record<string, unknown>; // custom context mixin
}) {
    const { service, level, env, base, redactPaths, pretty, contextMixin } =
        options;

    const isProd = env === 'production';
    const usePretty = pretty ?? (!isProd && process.stdout.isTTY);
    const levelFinal = level || (isProd ? 'info' : 'debug');
    const defaultBase = { service, ...(env ? { env } : {}) };
    const resolvedBase = { ...defaultBase, ...(base ?? {}) };

    const mixin = contextMixin || defaultContextMixin;

    const redact = Array.from(
        new Set([...(redactPaths ?? []), ...defaultRedact])
    );

    const transport = usePretty
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
        level: levelFinal,
        base: resolvedBase,
        timestamp: pino.stdTimeFunctions.isoTime,
        mixin: mixin,
        redact: {
            paths: redact,
            censor: '**Redacted**',
        },
        formatters: {
            level(label) {
                return { level: label };
            },
            bindings(b) {
                return { ...b };
            }, // keep service name on every line
        },
        ...(transport ? { transport } : {}),
    });
}

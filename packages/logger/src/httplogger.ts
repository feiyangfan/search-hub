import type { IncomingMessage, ServerResponse } from 'http';
import { pinoHttp, startTime } from 'pino-http';
import { createLogger } from './createLogger.js';

interface SerializerRequest {
    id?: number | string;
    method?: string;
    url?: string;
    query?: Record<string, unknown>;
}

interface SerializerResponse {
    statusCode: number;
}

type LoggedRequest = IncomingMessage & {
    id?: number | string;
    method?: string;
    url?: string;
    query?: unknown;
};

type LoggedResponse = ServerResponse & {
    statusCode: number;
};

export const httpLogger = pinoHttp({
    logger: createLogger('api-http'),
    serializers: {
        req(req: LoggedRequest): SerializerRequest {
            const rawQuery = req.query;
            const query =
                rawQuery !== undefined &&
                rawQuery !== null &&
                typeof rawQuery === 'object'
                    ? (rawQuery as Record<string, unknown>)
                    : undefined;
            return {
                id: req.id,
                method: req.method ?? undefined,
                url: req.url ?? undefined,
                ...(query ? { query } : {}),
            };
        },
        res(res: LoggedResponse): SerializerResponse {
            return { statusCode: res.statusCode };
        },
    },
    customLogLevel: function (req, res, err) {
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 300 && res.statusCode < 400) return 'debug';
        return 'info';
    },
    customSuccessMessage: function () {
        return 'request completed';
    },
    customErrorMessage: function () {
        return 'request failed';
    },
    customProps(_req, res) {
        const duration = Date.now() - res[startTime];
        return { responseTime: duration };
    },
});

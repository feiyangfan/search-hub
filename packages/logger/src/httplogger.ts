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
    customProps(_req, res) {
        const duration = Date.now() - res[startTime];
        return { responseTime: duration };
    },
});

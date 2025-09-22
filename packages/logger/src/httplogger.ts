import { pinoHttp, startTime } from 'pino-http';
import { createLogger } from './createLogger.js';

export const httpLogger = pinoHttp({
    logger: createLogger('api-http'),
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
            };
        },
        res(res) {
            return { statusCode: res.statusCode };
        },
    },
    customProps(_req, res) {
        const duration = Date.now() - res[startTime];
        return { responseTime: duration };
    },
});

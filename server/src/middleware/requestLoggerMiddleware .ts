import { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { httpLogger } from '../lib/logger.js';

export const equestLoggerMiddleware: RequestHandler = function (
    req,
    res,
    next
) {
    const headerId: string | string[] | undefined = req.headers['x-request-id'];
    // if request id already exists
    const reqId =
        typeof headerId === 'string' && headerId.length <= 128
            ? headerId
            : randomUUID();

    req.id = reqId;
    const log = httpLogger.child({ reqId: req.id });
    req.log = log;
    res.setHeader('X-Request-Id', reqId);

    const start = process.hrtime.bigint();
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

    res.once('finish', () => {
        // Access line
        req.log.info(
            {
                method: req.method,
                path: req.originalUrl ?? req.url,
                statusCode: res.statusCode,
                durationMs,
            },
            'request completed'
        );
    });

    res.once('close', () => {
        // client disconnected / aborted
        req.log.warn(
            {
                method: req.method,
                path: req.originalUrl ?? req.url,
                statusCode: res.statusCode,
                durationMs,
                aborted: true,
            },
            'request aborted'
        );
    });
    next();
};

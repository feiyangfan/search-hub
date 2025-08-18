import { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { httpLogger } from '../lib/logger.js';

export const requestLoggerMiddleware: RequestHandler = function (
    req,
    res,
    next
) {
    let completed = false;
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

    const requestTime = Date.now();
    const start = process.hrtime.bigint();

    res.once('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        // Access line
        req.log.info(
            {
                method: req.method,
                path: req.originalUrl ?? req.url,
                statusCode: res.statusCode,
                requestTime,
                durationMs,
                contentLength: res.getHeader('content-length'),
                userAgent: req.get('user-agent'),
                ip: req.ip,
            },
            'http_request'
        );
        completed = true;
    });

    res.once('close', () => {
        // client disconnected / aborted
        if (completed) {
            return;
        }
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        req.log.warn(
            {
                aborted: true,
                method: req.method,
                path: req.originalUrl ?? req.url,
                statusCode: res.statusCode,
                requestTime,
                durationMs,
                contentLength: res.getHeader('content-length'),
                userAgent: req.get('user-agent'),
                ip: req.ip,
            },
            'http_request_aborted'
        );
    });
    next();
};

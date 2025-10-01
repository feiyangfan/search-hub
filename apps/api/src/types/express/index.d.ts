import 'express';
import type pino from 'pino';
import type { ReqId } from 'pino-http';

declare module 'express-serve-static-core' {
    interface Request {
        validated?: {
            query?: unknown;
            body?: unknown;
        };
    }
}

declare global {
    namespace Express {
        interface Request {
            id: ReqId;
            log: pino.Logger;
        }
    }
}

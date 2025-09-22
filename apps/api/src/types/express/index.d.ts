import 'express';
import type pino from 'pino';
import type { ReqId } from 'pino-http';

declare global {
    namespace Express {
        interface Request {
            id: ReqId;
            log: pino.Logger;
        }
    }
}

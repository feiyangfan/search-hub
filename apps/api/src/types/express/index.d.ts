import 'express';
import type pino from 'pino';

declare global {
    namespace Express {
        interface Request {
            id: string;
            log: pino.Logger;
        }
    }
}

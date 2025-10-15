import 'express';
import type pino from 'pino';
import type { ReqId } from 'pino-http';
import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        email?: string;
        memberships?: {
            tenantId: string;
            tenantName: string;
            role: 'owner' | 'admin' | 'member';
        }[];
    }
}

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

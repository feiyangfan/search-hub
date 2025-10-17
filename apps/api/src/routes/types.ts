import type { Request } from 'express';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export interface RequestWithValidatedBody<TBody> extends Request {
    validated: {
        body: TBody;
        query?: unknown;
    };
}

export interface RequestWithValidatedQuery<TQuery> extends Request {
    validated: {
        query: TQuery;
        body?: unknown;
    };
}

export interface RequestWithValidatedParams<TParams> extends Request {
    validated: {
        params: TParams;
    };
}

export type AuthenticatedRequestWithBody<TBody> =
    RequestWithValidatedBody<TBody> & AuthenticatedRequest;

export type AuthenticatedRequestWithQuery<TQuery> =
    RequestWithValidatedQuery<TQuery> & AuthenticatedRequest;

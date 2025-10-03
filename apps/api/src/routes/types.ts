import type { Request } from 'express';

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

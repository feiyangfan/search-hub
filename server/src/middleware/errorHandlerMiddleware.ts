import { RequestHandler } from 'express';

export const errorHandlerMiddleware: RequestHandler = function (
    req,
    res,
    next
) {
    next();
};

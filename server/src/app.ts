import express from 'express';
import { logger } from './lib/logger.js';
import { equestLoggerMiddleware } from './middleware/requestLoggerMiddleware .js';

export const app = express();

app.use(equestLoggerMiddleware);

app.get('/health', (_req, res) => {
    logger.info('Health check ok!');
    res.status(200).json('OK!');
});

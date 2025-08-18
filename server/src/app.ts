import express from 'express';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware .js';

export const app = express();

app.use(requestLoggerMiddleware);

app.get('/health', (_req, res) => {
    _req.log.info('health_check');
    res.status(200).json('OK!');
});

// Test
app.post('/', (req, res) => {
    req.log.info({ params: req.params }, 'test');

    // Simulate a bug / failure
    try {
        throw new Error('Simulated failure for testing logs');
    } catch (err) {
        req.log.error({ err }, 'Handler failed');
        res.status(500).send('Internal Server Error');
    }
});

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../app.js';

interface ErrorBody {
    error: { code: string; message?: string; requestId?: string };
}

beforeAll(async () => {
    // Setup
});

afterAll(async () => {
    // Teardown
});

vi.mock('@search-hub/db', () => ({
    prisma: {
        tenant: {
            findFirst: vi.fn(),
        },
    },
    db: {
        document: {
            create: vi.fn(),
            findUnique: vi.fn(),
            getById: vi.fn(),
        },
    },
}));

vi.mock('../queue.js', () => ({
    indexQueue: { add: vi.fn() },
}));

vi.mock('@search-hub/ai', () => ({
    createVoyageHelpers: () => ({
        search: vi.fn(),
    }),
}));

describe('API Server', () => {
    const app = createServer();

    test('GET /health should return 200 OK', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'ok',
        });
    });

    test('GET /nonexistent should return 404 Not Found', async () => {
        const response = await request(app).get('/randomeurl');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');

        const body = response.body as ErrorBody;
        expect(body.error).toHaveProperty('code', 'NOT_FOUND');
        expect(body.error).toHaveProperty('message', 'Resource not found');
        expect(body.error).toHaveProperty('requestId');
    });

    describe('POST /v1/documents', () => {
        test('missing body should return 400', async () => {
            const response = await request(app).post('/v1/documents').send({});

            expect(response.status).toBe(400);

            const body = response.body as ErrorBody;
            expect(body).toHaveProperty('error');
            expect(body.error).toHaveProperty('code', 'INVALID_REQUEST');
            expect(body.error).toHaveProperty('requestId');
        });
    });

    test('GET /search without valid tenantId', async () => {
        const response = await request(app).get('/v1/search?q=test');

        expect(response.status).toBe(400);

        const body = response.body as ErrorBody;
        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('code', 'INVALID_REQUEST');
        expect(body.error).toHaveProperty('requestId');
    });
});

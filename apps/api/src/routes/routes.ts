// apps/api/src/routes.ts
// routes -> validate -> do work -> respond
import { Router } from 'express';
import { type z } from 'zod';
import {
    validateBody,
    validateQuery,
} from '../middleware/validateMiddleware.js';
import {
    CreateDocumentRequest,
    CreateDocumentResponse,
    SearchQuery,
    SearchResponse,
} from '@search-hub/schemas';

export function buildRoutes() {
    const r = Router();

    // POST /v1/documents → queue indexing (stub implementation)
    r.post(
        '/v1/documents',
        validateBody(CreateDocumentRequest),
        async (req, res) => {
            const body = (req as any).validated.body as z.infer<
                typeof CreateDocumentRequest
            >;

            // placeholder for now, #TODO: persist + enqueue job
            const resp: z.infer<typeof CreateDocumentResponse> = {
                id:
                    body.title.toLowerCase().replace(/\s+/g, '-') +
                    ' created at ' +
                    new Date(),
                status: 'queued',
            };

            res.status(202).json(resp); // 202 accepted since it's async work (queue)
        }
    );

    // GET /v1/search?q=&tenantId=...
    r.get('/v1/search', validateQuery(SearchQuery), async (req, res) => {
        const q = (req as any).validated.query as z.infer<typeof SearchQuery>;

        // placeholder for now, #TODO: real search later
        const resp: z.infer<typeof SearchResponse> = {
            total: 1,
            items: [
                {
                    id: 'doc_1',
                    title: `Result for query: "${q.q}"`,
                    snippet: 'Preview snippet',
                    score: 0.42,
                },
            ],
            page: 1,
            pageSize: Math.min(q.limit, 10),
        };

        res.json(resp);
    });

    return r;
}

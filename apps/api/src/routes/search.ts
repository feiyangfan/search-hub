import { Router } from 'express';
import { type z } from 'zod';

import {
    SearchQuery,
    SearchResponse,
    SemanticQuery,
} from '@search-hub/schemas';
import { prisma } from '@search-hub/db';
import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv, loadServerEnv } from '@search-hub/config-env';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import { validateQuery } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedQuery } from './types.js';

const {
    API_BREAKER_FAILURE_THRESHOLD,
    API_BREAKER_RESET_TIMEOUT_MS,
    API_BREAKER_HALF_OPEN_TIMEOUT_MS,
} = loadServerEnv();

const voyageBreaker = new CircuitBreaker({
    failureThreshold: API_BREAKER_FAILURE_THRESHOLD,
    resetTimeoutMs: API_BREAKER_RESET_TIMEOUT_MS,
    halfOpenTimeoutMs: API_BREAKER_HALF_OPEN_TIMEOUT_MS,
});

const env = loadAiEnv();
const VOYAGE_API_KEY = env.VOYAGE_API_KEY;

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

export function searchRoutes() {
    const router = Router();

    router.get(
        '/search',
        validateQuery(SearchQuery),
        async (req, res, next) => {
            try {
                const q = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchQuery>
                    >
                ).validated.query;

                const where = {
                    tenantId: q.tenantId,
                    title: { contains: q.q, mode: 'insensitive' as const },
                };

                const [items, total] = await Promise.all([
                    prisma.document.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        take: q.limit,
                        skip: q.offset,
                    }),
                    prisma.document.count({ where }),
                ]);

                const resp: z.infer<typeof SearchResponse> = {
                    total: total,
                    items: items.map((item: (typeof items)[number]) => ({
                        id: item.id,
                        title: item.title,
                    })),
                    page: Math.floor(q.offset / q.limit) + 1,
                    pageSize: q.limit,
                };

                res.json(resp);
            } catch (err) {
                next(err);
            }
        }
    );

    router.get(
        '/semantic-search',
        validateQuery(SemanticQuery),
        async (req, res, next) => {
            if (!voyageBreaker.canExecute()) {
                return res.status(503).json({
                    error: {
                        code: 'VOYAGE_UNAVAILABLE',
                        message:
                            'Semantic search is temporarily unavailable. Please retry shortly.',
                    },
                });
            }

            try {
                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SemanticQuery>
                    >
                ).validated.query;
                const { tenantId, q, k, recall_k } = query;

                const effectiveRecall = Math.max(recall_k ?? k, k);

                // Query embedding
                const qVec = await voyage.embed([String(q)], {
                    input_type: 'query',
                });

                // Vector Search with cosine
                interface Candidate {
                    documentId: string;
                    idx: number;
                    content: string;
                    distance: number;
                    similarity: number;
                }
                const candidates = await prisma.$queryRawUnsafe<Candidate[]>(
                    `
                    SELECT "documentId",
                           "idx",
                           "content",
                           (embedding <=> $1::vector) AS distance,
                           1 - (embedding <=> $1::vector) AS similarity
                    FROM "DocumentChunk"
                    WHERE "tenantId" = $2
                    ORDER BY distance ASC
                    LIMIT $3
                    `,
                    `[${qVec.join(',')}]`,
                    tenantId,
                    effectiveRecall
                );

                if (candidates.length === 0) {
                    voyageBreaker.recordSuccess();
                    return res.json({ items: [] });
                }

                // 3) Rerank those candidates (higher score = better)
                const rerank = await voyage.rerank(
                    String(q),
                    candidates.map((candidate: Candidate) => candidate.content)
                );

                voyageBreaker.recordSuccess();

                const byRerank = rerank
                    .sort((a, b) => b.score - a.score)
                    .slice(0, k)
                    .map(({ index, score }) => ({
                        ...candidates[index],
                        rerankScore: score, // Voyage's relevance score
                    }));

                res.json({ items: byRerank });
            } catch (error: unknown) {
                voyageBreaker.recordFailure();
                if (!voyageBreaker.canExecute()) {
                    return res.status(503).json({
                        error: {
                            code: 'VOYAGE_UNAVAILABLE',
                            message:
                                'Semantic search is temporarily unavailable. Please retry shortly.',
                        },
                    });
                }
                next(error);
            }
        }
    );

    return router;
}

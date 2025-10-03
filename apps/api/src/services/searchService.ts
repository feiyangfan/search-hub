import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv, loadServerEnv } from '@search-hub/config-env';
import { prisma as defaultPrisma } from '@search-hub/db';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import type { z } from 'zod';
import {
    SearchQuery,
    SearchResponse,
    SemanticQuery,
} from '@search-hub/schemas';

interface Candidate {
    documentId: string;
    idx: number;
    content: string;
    distance: number;
    similarity: number;
}

export interface SemanticSearchResultItem extends Candidate {
    rerankScore: number;
}

export interface SemanticSearchResult {
    items: SemanticSearchResultItem[];
}

interface SearchServiceDependencies {
    prisma?: typeof defaultPrisma;
    voyage?: ReturnType<typeof createVoyageHelpers>;
    breaker?: CircuitBreaker;
}

export interface SearchService {
    keywordSearch(
        query: z.infer<typeof SearchQuery>
    ): Promise<z.infer<typeof SearchResponse>>;
    semanticSearch(query: z.infer<typeof SemanticQuery>): Promise<SemanticSearchResult>;
    isSemanticSearchAvailable(): boolean;
}

export function createSearchService(
    deps: SearchServiceDependencies = {}
): SearchService {
    const {
        API_BREAKER_FAILURE_THRESHOLD,
        API_BREAKER_RESET_TIMEOUT_MS,
        API_BREAKER_HALF_OPEN_TIMEOUT_MS,
    } = loadServerEnv();

    const { VOYAGE_API_KEY } = loadAiEnv();

    const prisma = deps.prisma ?? defaultPrisma;
    const voyage =
        deps.voyage ?? createVoyageHelpers({ apiKey: VOYAGE_API_KEY });
    const breaker =
        deps.breaker ??
        new CircuitBreaker({
            failureThreshold: API_BREAKER_FAILURE_THRESHOLD,
            resetTimeoutMs: API_BREAKER_RESET_TIMEOUT_MS,
            halfOpenTimeoutMs: API_BREAKER_HALF_OPEN_TIMEOUT_MS,
        });

    async function keywordSearch(
        query: z.infer<typeof SearchQuery>
    ): Promise<z.infer<typeof SearchResponse>> {
        const where = {
            tenantId: query.tenantId,
            title: { contains: query.q, mode: 'insensitive' as const },
        };

        const [items, total] = await Promise.all([
            prisma.document.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: query.limit,
                skip: query.offset,
            }),
            prisma.document.count({ where }),
        ]);

        return {
            total,
            items: items.map((item) => ({
                id: item.id,
                title: item.title,
            })),
            page: Math.floor(query.offset / query.limit) + 1,
            pageSize: query.limit,
        };
    }

    async function semanticSearch(
        query: z.infer<typeof SemanticQuery>
    ): Promise<SemanticSearchResult> {
        const { tenantId, q, k, recall_k } = query;

        const effectiveRecall = Math.max(recall_k ?? k, k);

        try {
            const qVec = await voyage.embed([String(q)], {
                input_type: 'query',
            });

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
                breaker.recordSuccess();
                return { items: [] };
            }

            const rerank = await voyage.rerank(
                String(q),
                candidates.map((candidate) => candidate.content)
            );

            breaker.recordSuccess();

            const items: SemanticSearchResultItem[] = rerank
                .sort((a, b) => b.score - a.score)
                .slice(0, k)
                .map(({ index, score }) => {
                    const candidate = candidates[index];
                    if (!candidate) {
                        throw new Error(
                            'Rerank response referenced missing candidate'
                        );
                    }

                    return {
                        ...candidate,
                        rerankScore: score,
                    };
                });

            return { items };
        } catch (error) {
            breaker.recordFailure();
            throw error;
        }
    }

    function isSemanticSearchAvailable() {
        return breaker.canExecute();
    }

    return {
        keywordSearch,
        semanticSearch,
        isSemanticSearchAvailable,
    };
}

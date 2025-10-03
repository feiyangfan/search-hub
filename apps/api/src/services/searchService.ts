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

interface LexicalResultRow {
    id: string;
    title: string;
    snippet: string | null;
    score: number;
}

interface EnvOverrides {
    voyageApiKey?: string;
    breakerFailureThreshold?: number;
    breakerResetTimeoutMs?: number;
    breakerHalfOpenTimeoutMs?: number;
}

interface SearchServiceDependencies {
    prisma?: typeof defaultPrisma;
    voyage?: ReturnType<typeof createVoyageHelpers>;
    breaker?: CircuitBreaker;
    env?: EnvOverrides;
}

export interface SearchService {
    lexicalSearch(
        query: z.infer<typeof SearchQuery>
    ): Promise<z.infer<typeof SearchResponse>>;
    semanticSearch(
        query: z.infer<typeof SemanticQuery>
    ): Promise<SemanticSearchResult>;
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

    const env = deps.env ?? {};

    const breakerFailureThreshold =
        env.breakerFailureThreshold ?? API_BREAKER_FAILURE_THRESHOLD;
    const breakerResetTimeoutMs =
        env.breakerResetTimeoutMs ?? API_BREAKER_RESET_TIMEOUT_MS;
    const breakerHalfOpenTimeoutMs =
        env.breakerHalfOpenTimeoutMs ?? API_BREAKER_HALF_OPEN_TIMEOUT_MS;
    const voyageApiKey = env.voyageApiKey ?? VOYAGE_API_KEY;

    const prisma = deps.prisma ?? defaultPrisma;
    const voyage = deps.voyage ?? createVoyageHelpers({ apiKey: voyageApiKey });
    const breaker =
        deps.breaker ??
        new CircuitBreaker({
            failureThreshold: breakerFailureThreshold,
            resetTimeoutMs: breakerResetTimeoutMs,
            halfOpenTimeoutMs: breakerHalfOpenTimeoutMs,
        });

    async function lexicalSearch(
        query: z.infer<typeof SearchQuery>
    ): Promise<z.infer<typeof SearchResponse>> {
        const rows = await prisma.$queryRaw<LexicalResultRow[]>`
            SELECT d."id",
                   d."title",
                   ts_headline(
                       'english',
                       COALESCE(d."content", ''),
                       websearch_to_tsquery('english', ${query.q}),
                       'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30,MinWords=5'
                   ) AS snippet,
                   ts_rank(d."searchVector", websearch_to_tsquery('english', ${query.q})) AS score
            FROM "Document" d
            WHERE d."tenantId" = ${query.tenantId}
              AND d."searchVector" @@ websearch_to_tsquery('english', ${query.q})
            ORDER BY score DESC, d."createdAt" DESC
            LIMIT ${query.limit}
            OFFSET ${query.offset}
        `;

        const totalResult = await prisma.$queryRaw<{ count: number }[]>`
            SELECT COUNT(*)::int AS count
            FROM "Document" d
            WHERE d."tenantId" = ${query.tenantId}
              AND d."searchVector" @@ websearch_to_tsquery('english', ${query.q})
        `;

        const total = totalResult[0]?.count ?? 0;

        return {
            total,
            items: rows.map((row) => ({
                id: row.id,
                title: row.title,
                snippet: row.snippet ?? undefined,
                score: row.score,
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
        lexicalSearch,
        semanticSearch,
        isSemanticSearchAvailable,
    };
}

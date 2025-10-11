import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv } from '@search-hub/config-env';
import { env } from '../config/env.js';
import { prisma as defaultPrisma } from '@search-hub/db';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import type { z } from 'zod';
import {
    HybridSearchQuery,
    SearchQuery,
    SearchResponse,
    SemanticQuery,
} from '@search-hub/schemas';
import { logger } from '@search-hub/logger';

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
    hybridSearch(
        query: z.infer<typeof HybridSearchQuery>
    ): Promise<z.infer<typeof SearchResponse>>;
    isSemanticSearchAvailable(): boolean;
}

export function createSearchService(
    deps: SearchServiceDependencies = {}
): SearchService {
    const {
        API_BREAKER_FAILURE_THRESHOLD,
        API_BREAKER_RESET_TIMEOUT_MS,
        API_BREAKER_HALF_OPEN_TIMEOUT_MS,
    } = env;

    const { VOYAGE_API_KEY } = loadAiEnv();

    const overrides = deps.env ?? {};

    const breakerFailureThreshold =
        overrides.breakerFailureThreshold ?? API_BREAKER_FAILURE_THRESHOLD;
    const breakerResetTimeoutMs =
        overrides.breakerResetTimeoutMs ?? API_BREAKER_RESET_TIMEOUT_MS;
    const breakerHalfOpenTimeoutMs =
        overrides.breakerHalfOpenTimeoutMs ?? API_BREAKER_HALF_OPEN_TIMEOUT_MS;
    const voyageApiKey = overrides.voyageApiKey ?? VOYAGE_API_KEY;

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
        const rows = await prisma.$queryRaw<
            (LexicalResultRow & { total: number })[]
        >`
            SELECT d."id",
                d."title",
                ts_headline(
                    'english',
                    COALESCE(d."content", ''),
                    websearch_to_tsquery('english', ${query.q}),
                    'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30,MinWords=5'
                ) AS snippet,
                ts_rank(d."searchVector", websearch_to_tsquery('english', ${query.q})) AS score,
                COUNT(*) OVER()::int AS total
            FROM "Document" d
            WHERE d."tenantId" = ${query.tenantId}
            AND d."searchVector" @@ websearch_to_tsquery('english', ${query.q})
            ORDER BY score DESC, d."createdAt" DESC
            LIMIT ${query.limit}
            OFFSET ${query.offset}
        `;
        const total = rows[0]?.total ?? 0;

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
            // embed the query to get its vector representation
            const qVec = await voyage.embed([String(q)], {
                input_type: 'query',
            });

            // query the nearest neighbours using the embedding vector with cosine distance
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

            // rerank the candidates using the voyage rerank endpoint.
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

    async function hybridSearch(
        query: z.infer<typeof HybridSearchQuery>
    ): Promise<z.infer<typeof SearchResponse>> {
        const { tenantId, q } = query;

        // pageination
        const page = Math.floor(query.offset / query.limit) + 1;

        // if the request is for a later page but still within the first 50 results
        const expandLexicalWindow =
            query.offset > 0 && query.offset + query.limit <= 50;

        // expand lexical search window to cover the requested page
        // this ensures we have enough lexical results to fill the page after fusion
        // without this, we might miss high-ranking lexical results that fall just outside the requested page
        const lexicalLimit = expandLexicalWindow
            ? Math.min(query.offset + query.limit, 50)
            : query.limit;
        const lexicalOffset = expandLexicalWindow ? 0 : query.offset;

        // lexical search first
        const lexicalInput: z.infer<typeof SearchQuery> = {
            tenantId,
            q,
            limit: lexicalLimit,
            offset: lexicalOffset,
        };

        const lexicalResponse = await lexicalSearch(lexicalInput);
        const lexicalItems = lexicalResponse.items;

        // slice out the requested page if we expanded the window
        const lexicalOnlyItems = expandLexicalWindow
            ? lexicalItems.slice(query.offset, query.offset + query.limit)
            : lexicalItems;

        // if not semantic search, return lexical only
        const lexicalOnlyResponse: z.infer<typeof SearchResponse> = {
            total: lexicalResponse.total,
            items: lexicalOnlyItems,
            page,
            pageSize: query.limit,
        };

        if (!isSemanticSearchAvailable()) {
            return lexicalOnlyResponse;
        }

        // clamp to acceptable range, keeping within limits
        const clamp = (value: number, min: number, max: number) =>
            Math.max(min, Math.min(value, max));

        // determine semantic search params
        // we want to ensure we retrieve enough semantic candidates to cover the desired page after fusion
        // but also keep within the max limits
        const desiredWindow = Math.max(query.limit, query.offset + query.limit);
        const semanticKInput = query.semanticK ?? desiredWindow;
        const semanticK = clamp(semanticKInput, 1, 50);
        // ensure recall is at least k
        const semanticRecallInput =
            query.semanticRecall ?? Math.max(semanticK * 3, semanticK);

        const semanticRecall = clamp(
            Math.max(semanticRecallInput, semanticK),
            semanticK,
            50
        );

        let semanticResult: SemanticSearchResult | null = null;
        try {
            semanticResult = await semanticSearch({
                tenantId,
                q,
                k: semanticK,
                recall_k: semanticRecall,
            });
        } catch (error) {
            // failed semantic, return lexical only as fallback
            logger.error(
                {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
                'Semantic search failed, falling back to lexical'
            );
            if (!isSemanticSearchAvailable()) {
                return lexicalOnlyResponse;
            }
            return lexicalOnlyResponse;
        }

        // no semantic results, return lexical only
        if (!semanticResult || semanticResult.items.length === 0) {
            return lexicalOnlyResponse;
        }

        // RFF K constant
        const fusionK = query.rrfK ?? 60;
        // helper based on RFF formula
        // score(d) = sum(1 / (k +rank(d)))
        const setRRFScore = (
            map: Map<string, number>,
            docId: string,
            rank: number
        ) => {
            const current = map.get(docId) ?? 0;
            map.set(docId, current + 1 / (fusionK + rank));
        };

        // docScores accumulates scores for each docId
        const docScores = new Map<string, number>();
        // docMeta collects metadata for each docId
        const docMeta = new Map<
            string,
            {
                lexical?: z.infer<typeof SearchResponse>['items'][number];
                semanticSnippet?: string;
                semanticScore?: number;
            }
        >();

        // loop through lexical results
        lexicalItems.forEach((item, index) => {
            // try to get existing metadata or initialize
            const meta = docMeta.get(item.id) ?? {};
            // attach lexical info
            meta.lexical = item;
            // update meta map with new metadata
            docMeta.set(item.id, meta);
            // set RRF score for this document based on its rank
            setRRFScore(docScores, item.id, index + 1);
        });

        // first sort semantic results by rerank score descending
        const semanticItems = [...semanticResult.items].sort(
            (a, b) => b.rerankScore - a.rerankScore
        );

        const seenSemanticDocs = new Set<string>();

        // loop through semantic results and update scores and metadata
        semanticItems.forEach((item, index) => {
            // if this chunk belongs to a doc we've already seen, skip to avoid over-crediting
            if (seenSemanticDocs.has(item.documentId)) {
                return;
            }
            seenSemanticDocs.add(item.documentId);
            setRRFScore(docScores, item.documentId, index + 1);
            const meta = docMeta.get(item.documentId) ?? {};
            // attach snippet and semantic score
            if (!meta.semanticSnippet) {
                meta.semanticSnippet = item.content;
            }
            meta.semanticScore = item.rerankScore;
            docMeta.set(item.documentId, meta);
        });

        // sort documents by their RRF scores
        const scoredEntries = [...docScores.entries()].sort(
            (a, b) => b[1] - a[1]
        );

        const startIndex = expandLexicalWindow ? query.offset : 0;
        if (scoredEntries.length <= startIndex) {
            return lexicalOnlyResponse;
        }

        const semanticOnlyDocIds = scoredEntries
            .map(([docId]) => docId)
            .filter((docId) => {
                const meta = docMeta.get(docId);
                return meta && !meta.lexical;
            });

        const semanticDocDetails =
            semanticOnlyDocIds.length > 0
                ? await prisma.document.findMany({
                      where: {
                          tenantId,
                          id: { in: semanticOnlyDocIds },
                      },
                      select: {
                          id: true,
                          title: true,
                          content: true,
                      },
                  })
                : [];

        const semanticDocMap = new Map(
            semanticDocDetails.map((doc) => [doc.id, doc])
        );

        const truncateSnippet = (text: string, maxLength = 280) => {
            if (text.length <= maxLength) {
                return text;
            }
            return `${text.slice(0, maxLength).trimEnd()}...`;
        };

        const pagedEntries = scoredEntries.slice(
            startIndex,
            startIndex + query.limit
        );

        if (pagedEntries.length === 0) {
            return lexicalOnlyResponse;
        }

        const fusedItems = pagedEntries.map(([docId, score]) => {
            const meta = docMeta.get(docId);
            const lexicalItem = meta?.lexical;
            const semanticDoc = semanticDocMap.get(docId);
            const snippet =
                lexicalItem?.snippet ??
                (meta?.semanticSnippet
                    ? truncateSnippet(meta.semanticSnippet)
                    : semanticDoc?.content
                      ? truncateSnippet(semanticDoc.content)
                      : undefined);

            const title =
                lexicalItem?.title ?? semanticDoc?.title ?? 'Untitled document';

            return {
                id: docId,
                title,
                snippet,
                score: Number(score.toFixed(6)),
                url: lexicalItem?.url,
            } satisfies z.infer<typeof SearchResponse>['items'][number];
        });

        if (fusedItems.length === 0) {
            return lexicalOnlyResponse;
        }

        return {
            total: Math.max(lexicalResponse.total, docMeta.size),
            items: fusedItems,
            page,
            pageSize: query.limit,
        };
    }

    function isSemanticSearchAvailable() {
        return breaker.canExecute();
    }

    return {
        lexicalSearch,
        semanticSearch,
        hybridSearch,
        isSemanticSearchAvailable,
    };
}

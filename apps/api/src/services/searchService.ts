import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv } from '@search-hub/config-env';
import { env } from '../config/env.js';
import { db, type SearchCandidate } from '@search-hub/db';
import { CircuitBreaker } from '../lib/circuitBreaker.js';
import type {
    SearchQueryWithTenant,
    SemanticQueryWithTenant,
    HybridSearchQueryWithTenant,
    SearchResponse,
    SearchResultItem,
} from '@search-hub/schemas';
import { logger } from '@search-hub/logger';
import { metrics } from '@search-hub/observability';

export interface SemanticSearchResultItem extends SearchCandidate {
    rerankScore: number;
    documentTitle?: string;
}

export interface SemanticSearchResult {
    items: SemanticSearchResultItem[];
}

interface EnvOverrides {
    voyageApiKey?: string;
    breakerFailureThreshold?: number;
    breakerResetTimeoutMs?: number;
    breakerHalfOpenTimeoutMs?: number;
    semanticRerankThreshold?: number;
}

interface SearchServiceDependencies {
    voyage?: ReturnType<typeof createVoyageHelpers>;
    breaker?: CircuitBreaker;
    env?: EnvOverrides;
}

function normalizeAndTokenize(query: string): string[] {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

export interface SearchService {
    lexicalSearch(query: SearchQueryWithTenant): Promise<SearchResponse>;
    semanticSearch(
        query: SemanticQueryWithTenant
    ): Promise<SemanticSearchResult>;
    hybridSearch(query: HybridSearchQueryWithTenant): Promise<SearchResponse>;
    isSemanticSearchAvailable(): boolean;
    logSearch(params: {
        tenantId: string;
        userId: string;
        query: string;
        searchType: 'lexical' | 'semantic' | 'hybrid';
        resultCount: number;
        duration: number;
        status: 'success' | 'error' | 'partial';
    }): Promise<void>;
}

/**
 * Stitch adjacent chunks together, removing overlapping text
 * Chunks are created with 100 char overlap, so we need to remove duplicates at boundaries
 */
function stitchChunks(chunks: { idx: number; content: string }[]): string {
    if (chunks.length === 0) return '';

    const firstChunk = chunks[0];
    if (chunks.length === 1) {
        return firstChunk?.content ?? '';
    }

    let result = firstChunk?.content ?? '';

    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const currentChunk = chunk.content;

        // Try to find overlap at the boundary (up to 100 chars)
        let overlapLength = 0;
        const maxOverlap = Math.min(100, result.length, currentChunk.length);

        // Search for the longest overlap
        for (let len = maxOverlap; len > 20; len--) {
            const endOfPrevious = result.slice(-len);
            const startOfCurrent = currentChunk.slice(0, len);

            if (endOfPrevious === startOfCurrent) {
                overlapLength = len;
                break;
            }
        }

        // If we found overlap, skip it. Otherwise add a space separator
        if (overlapLength > 0) {
            result += currentChunk.slice(overlapLength);
        } else {
            // No overlap found, add with space separator
            result += ' ' + currentChunk;
        }
    }

    return result;
}

export function createSearchService(
    deps: SearchServiceDependencies = {}
): SearchService {
    const {
        API_BREAKER_FAILURE_THRESHOLD,
        API_BREAKER_RESET_TIMEOUT_MS,
        API_BREAKER_HALF_OPEN_TIMEOUT_MS,
        SEMANTIC_RERANK_THRESHOLD,
        SEMANTIC_TOP_SCORE_CUTOFF,
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
    const semanticRerankThreshold =
        overrides.semanticRerankThreshold ?? SEMANTIC_RERANK_THRESHOLD ?? 0.35;
    const semanticTopScoreCutoff = SEMANTIC_TOP_SCORE_CUTOFF ?? 0.55;

    const voyage = deps.voyage ?? createVoyageHelpers({ apiKey: voyageApiKey });
    const breaker =
        deps.breaker ??
        new CircuitBreaker({
            failureThreshold: breakerFailureThreshold,
            resetTimeoutMs: breakerResetTimeoutMs,
            halfOpenTimeoutMs: breakerHalfOpenTimeoutMs,
            serviceName: 'voyage_ai', // Track Voyage AI service health
        });

    async function lexicalSearch(
        query: SearchQueryWithTenant
    ): Promise<SearchResponse> {
        const result = await db.search.lexicalSearchDocuments(
            query.tenantId,
            query.q,
            query.limit,
            query.offset
        );

        return {
            total: result.total,
            items: result.items.map((row) => ({
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
        query: SemanticQueryWithTenant
    ): Promise<SemanticSearchResult> {
        const startEmbedding = Date.now();
        const { tenantId, q, k, recall_k } = query;

        const effectiveRecall = Math.max(recall_k ?? k, k);

        try {
            // embed the query to get its vector representation
            const qVecs = await voyage.embed([String(q)], {
                input_type: 'query',
            });
            metrics.aiRequestDuration.observe(
                { provider: 'voyage', operation: 'embed' },
                (Date.now() - startEmbedding) / 1000
            );

            const qVec = qVecs[0];
            if (!qVec) {
                throw new Error('Failed to generate embedding for query');
            }

            // query the nearest neighbours using the embedding vector with cosine distance
            const candidates: SearchCandidate[] =
                await db.search.findNearestChunks(
                    tenantId,
                    qVec,
                    effectiveRecall
                );

            if (candidates.length === 0) {
                breaker.recordSuccess();
                return { items: [] };
            }

            // rerank the candidates using the voyage rerank endpoint.
            const startRerank = Date.now();
            const rerank = await voyage.rerank(
                String(q),
                candidates.map((candidate) => candidate.content)
            );
            metrics.aiRequestDuration.observe(
                { provider: 'voyage', operation: 'rerank' },
                (Date.now() - startRerank) / 1000
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

            // Fetch adjacent chunks for contextual retrieval
            // For each top result, get surrounding chunks to provide fuller context
            const contextWindow = 1; // Fetch 1 chunk before and after
            const itemsWithContext = await Promise.all(
                items.map(async (item) => {
                    try {
                        const adjacentChunks =
                            await db.search.getAdjacentChunks(
                                item.documentId,
                                tenantId,
                                item.idx,
                                contextWindow
                            );

                        // Edge case: If no adjacent chunks found (shouldn't happen), use original
                        if (adjacentChunks.length === 0) {
                            return item;
                        }

                        // Stitch chunks together, removing overlap
                        const stitchedContent = stitchChunks(adjacentChunks);

                        return {
                            ...item,
                            content: stitchedContent,
                        };
                    } catch (error) {
                        // If fetching context fails, fall back to original chunk
                        logger.warn(
                            {
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                                documentId: item.documentId,
                                idx: item.idx,
                            },
                            'Failed to fetch adjacent chunks, using original'
                        );
                        return item;
                    }
                })
            );

            // Deduplicate by documentId, keeping highest scoring chunk per document
            const docScores = new Map<
                string,
                { item: SemanticSearchResultItem; score: number }
            >();
            for (const item of itemsWithContext) {
                const existing = docScores.get(item.documentId);
                if (!existing || item.rerankScore > existing.score) {
                    docScores.set(item.documentId, {
                        item,
                        score: item.rerankScore,
                    });
                }
            }

            // Fetch document titles from database
            const documentIds = Array.from(docScores.keys());
            const documents = (await db.search.getDocumentTitlesByIds(
                documentIds,
                tenantId
            )) as { id: string; title: string }[];

            const docTitleMap = new Map(documents.map((d) => [d.id, d.title]));

            // Add document titles to items
            const deduplicatedItems: SemanticSearchResultItem[] = Array.from(
                docScores.values()
            )
                .sort((a, b) => b.score - a.score)
                .map(({ item }) => ({
                    ...item,
                    documentTitle:
                        docTitleMap.get(item.documentId) || 'Untitled',
                }));

            return { items: deduplicatedItems };
        } catch (error) {
            breaker.recordFailure();
            throw error;
        }
    }

    async function hybridSearch(
        query: HybridSearchQueryWithTenant
    ): Promise<SearchResponse> {
        const { tenantId, q } = query;
        const tokens = normalizeAndTokenize(String(q));
        const meaningfulTokens = tokens.filter((t) => t.length > 3);

        // Guard: very short or only stopwords -> empty result to avoid noise
        if (meaningfulTokens.length === 0) {
            logger.debug(
                {
                    tenantId,
                    query: q,
                    reason: 'short_or_stopword_only',
                },
                'search.query.filtered'
            );
            return {
                total: 0,
                items: [],
                page: Math.floor(query.offset / query.limit) + 1,
                pageSize: query.limit,
            };
        }

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
        const lexicalInput: SearchQueryWithTenant = {
            tenantId,
            q,
            limit: lexicalLimit,
            offset: lexicalOffset,
        };

        const lexicalResponse = await lexicalSearch(lexicalInput);
        const lexicalItems = lexicalResponse.items;
        logger.debug(
            {
                tenantId,
                query: q,
                type: 'lexical',
                count: lexicalItems.length,
                topIds: lexicalItems.slice(0, 5).map((i) => i.id),
            },
            'search.lexical.results'
        );

        // slice out the requested page if we expanded the window
        const lexicalOnlyItems = expandLexicalWindow
            ? lexicalItems.slice(query.offset, query.offset + query.limit)
            : lexicalItems;

        // if not semantic search, return lexical only
        const lexicalOnlyResponse: SearchResponse = {
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
            logger.debug(
                {
                    tenantId,
                    query: q,
                    type: 'semantic',
                    count: semanticResult?.items.length ?? 0,
                    topIds: semanticResult
                        ? semanticResult.items.slice(0, 5).map((i) => ({
                              docId: i.documentId,
                              score: i.rerankScore,
                          }))
                        : [],
                    threshold: semanticRerankThreshold,
                },
                'search.semantic.results'
            );
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
                lexical?: SearchResultItem;
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

        // Filter out semantic results with low rerank scores to avoid noise
        const relevantSemanticItems = semanticItems.filter(
            (item) => item.rerankScore >= semanticRerankThreshold
        );

        // If no lexical hits and top semantic score is weak, return empty
        if (
            lexicalItems.length === 0 &&
            relevantSemanticItems.length > 0 &&
            (relevantSemanticItems[0]?.rerankScore ?? 0) <
                semanticTopScoreCutoff
        ) {
            logger.debug(
                {
                    tenantId,
                    query: q,
                    topSemanticScore:
                        relevantSemanticItems[0]?.rerankScore ?? null,
                    cutoff: semanticTopScoreCutoff,
                },
                'search.semantic.filtered_by_top_score'
            );
            return {
                total: 0,
                items: [],
                page,
                pageSize: query.limit,
                noStrongMatches: true,
            };
        }

        const seenSemanticDocs = new Set<string>();

        // loop through semantic results and update scores and metadata
        relevantSemanticItems.forEach((item, index) => {
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
                ? await db.search.getDocumentDetailsByIds(
                      semanticOnlyDocIds,
                      tenantId
                  )
                : [];

        const semanticDocMap = new Map(
            semanticDocDetails.map((doc) => [doc.id, doc])
        );

        const truncateSnippet = (text: string, maxLength = 220) => {
            if (text.length <= maxLength) {
                return text;
            }
            // Try to cut at a word boundary before maxLength
            let cutoff = text.lastIndexOf(' ', maxLength);
            if (cutoff === -1 || cutoff < maxLength * 0.6) {
                cutoff = maxLength;
            }
            let candidate = text.slice(0, cutoff).trimEnd();
            // Avoid cutting inside an HTML tag
            const lastOpen = candidate.lastIndexOf('<');
            const lastClose = candidate.lastIndexOf('>');
            if (lastOpen > lastClose) {
                candidate = candidate.slice(0, lastOpen).trimEnd();
            }
            return `${candidate}...`;
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
                (lexicalItem?.snippet
                    ? truncateSnippet(lexicalItem.snippet)
                    : undefined) ??
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
            } satisfies SearchResultItem;
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

    async function logSearch(params: {
        tenantId: string;
        userId: string;
        query: string;
        searchType: 'lexical' | 'semantic' | 'hybrid';
        resultCount: number;
        duration: number;
        status: 'success' | 'error' | 'partial';
    }): Promise<void> {
        try {
            await db.searchLog.create({
                tenantId: params.tenantId,
                userId: params.userId,
                query: params.query,
                searchType: params.searchType,
                resultCount: params.resultCount,
                duration: params.duration,
                status: params.status,
            });
        } catch (error) {
            // Don't let logging failures affect search requests
            logger.error(
                {
                    error:
                        error instanceof Error ? error.message : String(error),
                    tenantId: params.tenantId,
                    userId: params.userId,
                },
                'Failed to log search event'
            );
        }
    }

    return {
        lexicalSearch,
        semanticSearch,
        hybridSearch,
        isSemanticSearchAvailable,
        logSearch,
    };
}

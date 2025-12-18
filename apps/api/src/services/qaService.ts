import { createGroqHelpers, normalizeQuery } from '@search-hub/ai';
import { logger as baseLogger } from '../logger.js';
import {
    QaRequestWithTenant,
    type QaResponse,
    type QaSource,
} from '@search-hub/schemas';
import { createSearchService, type SearchService } from './searchService.js';

export interface QaService {
    answerQuestion(params: QaRequestWithTenant): Promise<QaResponse>;
}

interface QaDependencies {
    searchService?: SearchService;
}

const logger = baseLogger.child({ component: 'qa-service' });

function buildPrompt(question: string, sources: QaSource[]): string {
    const context = sources
        .map(
            (source, idx) =>
                `[${idx + 1}] Title: ${source.title}\n${source.snippet}`
        )
        .join('\n\n');

    return [
        'You must use the Context as your primary source.',
        'If the Context fully supports the answer: answer using only the Context and cite sources like [1], [2].',
        'If the Context is insufficient: say "Context is insufficient" and then provide a best-effort answer from general knowledge WITHOUT citations.',
        'Never fabricate citations; only cite items present in Context.',
        `Question: ${question}`,
        'Context:',
        context || '(no context provided)',
    ].join('\n\n');
}

interface QaModelOut {
    answer: string;
    citations: number[];
    noContext: boolean;
}

function safeJsonParse<T>(s: string): T | null {
    try {
        return JSON.parse(s) as T;
    } catch {
        return null;
    }
}

export function createQaService(deps: QaDependencies = {}): QaService {
    const searchService = deps.searchService ?? createSearchService();
    const { chat } = createGroqHelpers();

    async function answerQuestion(
        params: QaRequestWithTenant
    ): Promise<QaResponse> {
        const {
            tenantId,
            question,
            k = 5,
            recall_k = 15,
            maxSources = 5,
        } = params;

        // Normalize query before semantic search
        const normalizedQuery = normalizeQuery(question);

        logger.debug(
            {
                originalQuery: question,
                normalizedQuery,
            },
            'qa.query_normalized'
        );

        const semanticResult = await searchService.semanticSearch({
            tenantId,
            q: normalizedQuery,
            k,
            recall_k,
        });

        const sources: QaSource[] = semanticResult.items
            .slice(0, maxSources)
            .map((item) => ({
                id: item.documentId,
                title: item.documentTitle ?? 'Untitled',
                snippet: item.content ?? '',
                score: item.rerankScore,
            }));

        if (sources.length === 0) {
            return {
                answer: 'I could not find relevant context in your workspace to answer this question.',
                sources: [],
                noContext: true,
            };
        }

        const prompt = buildPrompt(question, sources);

        const systemMessage = `
        Return ONLY valid JSON with this schema:
        {
        "answer": string,
        "citations": number[],
        "noContext": boolean
        }

        Rules:
        - If you used Context, citations must contain the source numbers you relied on (e.g., [1] => 1).
        - If Context is insufficient, set noContext=true and citations=[].
        - Never invent citations.
        - Do not output any text outside JSON.
        `;

        try {
            const answer = await chat({
                prompt,
                temperature: 0.2,
                maxTokens: 600,
                system: systemMessage,
            });

            const parsed = safeJsonParse<QaModelOut>(answer);

            if (!parsed) {
                // fallback: treat as no context to avoid returning irrelevant sources
                return { answer: answer, sources: [], noContext: true };
            }

            function isQaSource(x: QaSource | undefined): x is QaSource {
                return x !== undefined;
            }

            const citedSources: QaSource[] = parsed.citations
                .filter((n) => n >= 1 && n <= sources.length) // optional but recommended
                .map((n) => sources[n - 1])
                .filter(isQaSource);
            logger.info(
                {
                    tenantId,
                    questionLength: question.length,
                    sourcesCount: sources.length,
                    answerLength: answer.length,
                },
                'qa.answer.succeeded'
            );

            return {
                answer: parsed.answer,
                sources: citedSources,
                noContext: parsed.noContext,
            };
        } catch (error) {
            logger.error(
                {
                    error:
                        error instanceof Error ? error.message : String(error),
                },
                'qa.answer.failed'
            );
            throw error;
        }
    }

    return {
        answerQuestion,
    };
}

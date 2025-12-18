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
        'Answer the user question using only the context below.',
        'Cite sources with [number]. If context is missing or insufficient, say you need more information.',
        `Question: ${question}`,
        'Context:',
        context || '(no context provided)',
    ].join('\n\n');
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

        const systemMessage = `You are an assistant that answers using the user’s workspace documents as the primary source of truth.
Follow these rules:
- Always read and rely on the provided Context first. Cite sources as [1], [2], etc.
- If the context is sufficient, answer concisely using only that context.
- If the context is insufficient, say so and provide a brief, best-effort answer from your own knowledge. Do NOT invent citations for knowledge you supply yourself.
- Never fabricate sources. Only cite items explicitly present in the Context.
- If the question asks for live/online info, say you cannot browse and proceed with your best offline answer (without citations unless supported by Context).
Tone: concise, direct, helpful.
`;

        try {
            const answer = await chat({
                prompt,
                temperature: 0.2,
                maxTokens: 600,
                system: systemMessage,
            });

            logger.info(
                {
                    tenantId,
                    questionLength: question.length,
                    sourcesCount: sources.length,
                    answerLength: answer.length,
                },
                'qa.answer.succeeded'
            );

            return { answer, sources };
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

import { voyageEmbed, VoyageEmbeddingInput } from './voyageEmbedding.js';
import { voyageRerank } from './voyageRerank.js';
import { chat, streamChat } from './llm.js';
import { normalizeQuery } from './queryNormalization.js';
import { chunkMarkdown, type MarkdownChunk } from './markdownChunking.js';

export const createVoyageHelpers = ({ apiKey }: { apiKey: string }) => ({
    embed: (
        texts: string[],
        opts: Partial<Omit<VoyageEmbeddingInput, 'input'>> = {}
    ) => voyageEmbed(apiKey, texts, opts),
    rerank: (query: string, docs: string[]) =>
        voyageRerank(apiKey, query, docs),
});

// Factory for Groq LLM helpers
export const createGroqHelpers = () => ({
    chat,
    streamChat,
});

// Query normalization utilities
export { normalizeQuery } from './queryNormalization.js';

// Markdown chunking utilities
export { chunkMarkdown, type MarkdownChunk } from './markdownChunking.js';

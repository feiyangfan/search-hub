import { voyageEmbed, VoyageEmbeddingInput } from './voyageEmbedding.js';
import { voyageRerank } from './voyageRerank.js';

export const createVoyageHelpers = ({ apiKey }: { apiKey: string }) => ({
    embed: (
        texts: string[],
        opts: Partial<Omit<VoyageEmbeddingInput, 'input'>> = {}
    ) => voyageEmbed(apiKey, texts, opts),
    rerank: (query: string, docs: string[]) =>
        voyageRerank(apiKey, query, docs),
});

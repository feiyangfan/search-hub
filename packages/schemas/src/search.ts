import { z } from 'zod';
import { Id, Pagination } from './common.js';

export const SearchQuery = z.object({
    q: z.string().min(1).meta({ example: 'typescript' }), // the query itself
    limit: z.coerce.number().int().min(1).max(50).default(10).meta({
        description: 'Maximum number of results to return',
        example: 10,
    }), // size limit to protect server
    offset: z.coerce.number().int().min(0).default(0).meta({
        description: 'Number of results to skip for pagination',
        example: 0,
    }), // simple pagination
});

export const SemanticQuery = z.object({
    q: z.string().min(1),
    k: z.coerce.number().int().min(1).max(50).default(5),
    recall_k: z.coerce.number().int().min(1).max(50).default(5),
});

// Export types for use in services/routes
export type SearchQuery = z.infer<typeof SearchQuery>;
export type SemanticQuery = z.infer<typeof SemanticQuery>;
export type HybridSearchQuery = z.infer<typeof HybridSearchQuery>;
export type SearchResponse = z.infer<typeof SearchResponse>;
export type SearchResultItem = z.infer<typeof SearchResultItem>;

// Internal types with tenantId (added by routes layer, not from frontend)
export type SearchQueryWithTenant = SearchQuery & { tenantId: string };
export type SemanticQueryWithTenant = SemanticQuery & { tenantId: string };
export type HybridSearchQueryWithTenant = HybridSearchQuery & {
    tenantId: string;
};

export const HybridSearchQuery = SearchQuery.extend({
    semanticK: z.coerce.number().int().min(1).max(50).optional().meta({
        description:
            'Number of semantic candidates to fuse (defaults to limit)',
        example: 10,
    }), // number of semantic candidates to fuse
    semanticRecall: z.coerce.number().int().min(1).max(50).optional().meta({
        description:
            'Number of semantic candidates to retrieve before rerank (defaults to semanticK or limit)',
        example: 20,
    }), // number of semantic candidates to retrieve before rerank
    rrfK: z.coerce.number().int().min(1).max(100).default(60).meta({
        description:
            'Reciprocal Rank Fusion constant. Lower values favor top ranks more strongly.',
        example: 60,
    }), // RRF k constant
});

// inside searchresponse.items
export const SearchResultItem = z.object({
    id: Id,
    title: z.string().meta({ example: 'typescript documentation 1' }),
    snippet: z.string().optional().meta({
        description: 'A short snippet of the matched content',
        example:
            'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript...',
    }), // snippet of the matched content for preview
    score: z.number().optional().meta({
        description: 'Relevance score for ranking',
        example: 0.95,
    }), // relevance score for ranking
    url: z.string().optional().meta({
        description: 'Link to the full document or resource',
        example: 'https://www.typescriptlang.org/docs/',
    }), // deep link for detail page or external source
});

// full response schema
export const SearchResponse = z.object({
    total: z.number().int().nonnegative().meta({
        description: 'Total number of matched items',
        example: 100,
    }), // total matched items
    items: z.array(SearchResultItem), // paginated result items
    page: Pagination.shape.page.optional(), // page-stype hints optional
    pageSize: Pagination.shape.pageSize.optional(),
    noStrongMatches: z
        .boolean()
        .optional()
        .meta({ description: 'True when results were filtered out due to low confidence' }),
});

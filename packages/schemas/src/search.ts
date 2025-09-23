// packages/schemas/src/search.ts
import { z } from 'zod';
import { Id, Pagination } from './common.js';

export const SearchQuery = z.object({
    tenantId: Id.meta({
        description: 'Tenant ID to scope the search',
        example: 'tenant123',
    }), // for scoping
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
});

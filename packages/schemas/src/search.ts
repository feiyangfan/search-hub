// packages/schemas/src/search.ts
import { z } from 'zod';
import { Id, Pagination } from './common.js';

export const SearchQuery = z.object({
    tenantId: Id, // for scoping
    q: z.string().min(1).meta({ example: 'typescript' }), // the query itself
    limit: z.coerce.number().int().min(1).max(50).default(10), // size limit to protect server
    offset: z.coerce.number().int().min(0).default(0), // simple pagination
});

// inside searchresponse.items
export const SearchResultItem = z.object({
    id: Id,
    title: z.string().meta({ example: 'typescript documentation 1' }),
    snippet: z.string().optional(), // snippet of the matched content for preview
    score: z.number().optional(), // relevance score for ranking
    url: z.string().optional(), // deep link for detail page or external source
});

// full response schema
export const SearchResponse = z.object({
    total: z.number().int().nonnegative(), // total matched items
    items: z.array(SearchResultItem), // paginated result items
    page: Pagination.shape.page.optional(), // page-stype hints optional
    pageSize: Pagination.shape.pageSize.optional(),
});

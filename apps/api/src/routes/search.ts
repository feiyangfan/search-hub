import { Router } from 'express';
import { type z } from 'zod';

import {
    HybridSearchQuery,
    SearchQuery,
    SemanticQuery,
} from '@search-hub/schemas';

import { validateQuery } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedQuery } from './types.js';
import {
    createSearchService,
    type SearchService,
} from '../services/searchService.js';

export function searchRoutes(service: SearchService = createSearchService()) {
    const router = Router();

    router.get(
        '/lexical-search',
        validateQuery(SearchQuery),
        async (req, res, next) => {
            try {
                const q = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchQuery>
                    >
                ).validated.query;

                const response = await service.lexicalSearch(q);

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    router.get(
        '/hybrid-search',
        validateQuery(HybridSearchQuery),
        async (req, res, next) => {
            try {
                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof HybridSearchQuery>
                    >
                ).validated.query;

                const response = await service.hybridSearch(query);

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    router.get(
        '/semantic-search',
        validateQuery(SemanticQuery),
        async (req, res, next) => {
            if (!service.isSemanticSearchAvailable()) {
                return res.status(503).json({
                    error: {
                        code: 'VOYAGE_UNAVAILABLE',
                        message:
                            'Semantic search is temporarily unavailable. Please retry shortly.',
                    },
                });
            }

            try {
                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SemanticQuery>
                    >
                ).validated.query;
                const { items } = await service.semanticSearch(query);

                res.json({ items });
            } catch (error: unknown) {
                if (!service.isSemanticSearchAvailable()) {
                    return res.status(503).json({
                        error: {
                            code: 'VOYAGE_UNAVAILABLE',
                            message:
                                'Semantic search is temporarily unavailable. Please retry shortly.',
                        },
                    });
                }
                next(error);
            }
        }
    );

    return router;
}

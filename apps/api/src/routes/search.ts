import { Router } from 'express';
import { type z } from 'zod';

import {
    HybridSearchQuery,
    SearchQuery,
    SemanticQuery,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';

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
            const startTime = Date.now();

            try {
                const q = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchQuery>
                    >
                ).validated.query;

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: req.session.currentTenantId ?? 'unknown',
                    search_type: 'lexical',
                });

                const response = await service.lexicalSearch(q);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'lexical',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (err) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'lexical',
                        status: 'error',
                    },
                    duration
                );
                next(err);
            }
        }
    );

    router.get(
        '/hybrid-search',
        validateQuery(HybridSearchQuery),
        async (req, res, next) => {
            const startTime = Date.now();

            try {
                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof HybridSearchQuery>
                    >
                ).validated.query;

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: req.session.currentTenantId ?? 'unknown',
                    search_type: 'hybrid',
                });

                const response = await service.hybridSearch(query);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'hybrid',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (err) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'hybrid',
                        status: 'error',
                    },
                    duration
                );
                next(err);
            }
        }
    );

    router.get(
        '/semantic-search',
        validateQuery(SemanticQuery),
        async (req, res, next) => {
            const startTime = Date.now();

            if (!service.isSemanticSearchAvailable()) {
                // Track circuit breaker open state
                metrics.searchRequests.inc({
                    tenant_id: req.session.currentTenantId ?? 'unknown',
                    search_type: 'semantic_unavailable',
                });

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

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: req.session.currentTenantId ?? 'unknown',
                    search_type: 'semantic',
                });

                const { items } = await service.semanticSearch(query);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'semantic',
                        status: 'success',
                    },
                    duration
                );

                res.json({ items });
            } catch (error: unknown) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: req.session.currentTenantId ?? 'unknown',
                        search_type: 'semantic',
                        status: 'error',
                    },
                    duration
                );

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

import { Router } from 'express';
import { type z } from 'zod';

import {
    HybridSearchQuery,
    SearchQuery,
    SemanticQuery,
    AppError,
} from '@search-hub/schemas';
import { metrics } from '@search-hub/observability';

import { validateQuery } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedQuery } from './types.js';
import { type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
    createSearchService,
    type SearchService,
} from '../services/searchService.js';

export function searchRoutes(service: SearchService = createSearchService()) {
    const router = Router();

    // Default search endpoint - uses hybrid search (best of both worlds)
    router.get(
        '/search',
        validateQuery(HybridSearchQuery),
        async (req, res, next) => {
            const startTime = Date.now();

            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search',
                                operation: 'hybrid',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof HybridSearchQuery>
                    >
                ).validated.query;

                // Add tenantId from session for security
                const searchQuery = {
                    ...query,
                    tenantId: activeTenantId,
                };

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: activeTenantId,
                    search_type: 'hybrid',
                });

                const response = await service.hybridSearch(searchQuery);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: activeTenantId,
                        search_type: 'hybrid',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (err) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                const authReq = req as AuthenticatedRequest;
                metrics.searchDuration.observe(
                    {
                        tenant_id:
                            authReq.session?.currentTenantId ?? 'unknown',
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
        '/lexical-search',
        validateQuery(SearchQuery),
        async (req, res, next) => {
            const startTime = Date.now();

            try {
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search',
                                operation: 'lexical',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchQuery>
                    >
                ).validated.query;

                // Add tenantId from session for security
                const searchQuery = {
                    ...query,
                    tenantId: activeTenantId,
                };

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: activeTenantId,
                    search_type: 'lexical',
                });

                const response = await service.lexicalSearch(searchQuery);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: activeTenantId,
                        search_type: 'lexical',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (err) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                const authReq = req as AuthenticatedRequest;
                metrics.searchDuration.observe(
                    {
                        tenant_id:
                            authReq.session?.currentTenantId ?? 'unknown',
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
                const authReq = req as AuthenticatedRequest;
                const activeTenantId = authReq.session?.currentTenantId;

                if (!activeTenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search',
                                operation: 'hybrid',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof HybridSearchQuery>
                    >
                ).validated.query;

                // Add tenantId from session for security
                const searchQuery = {
                    ...query,
                    tenantId: activeTenantId,
                };

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: activeTenantId,
                    search_type: 'hybrid',
                });

                const response = await service.hybridSearch(searchQuery);

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: activeTenantId,
                        search_type: 'hybrid',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (err) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                const authReq = req as AuthenticatedRequest;
                metrics.searchDuration.observe(
                    {
                        tenant_id:
                            authReq.session?.currentTenantId ?? 'unknown',
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
            const authReq = req as AuthenticatedRequest;
            const activeTenantId = authReq.session?.currentTenantId;

            if (!activeTenantId) {
                throw AppError.validation(
                    'NO_ACTIVE_TENANT',
                    'No active tenant selected.',
                    {
                        context: {
                            origin: 'server',
                            domain: 'search',
                            operation: 'semantic',
                        },
                    }
                );
            }

            if (!service.isSemanticSearchAvailable()) {
                // Track circuit breaker open state
                metrics.searchRequests.inc({
                    tenant_id: activeTenantId,
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

                // Add tenantId from session for security
                const searchQuery = {
                    ...query,
                    tenantId: activeTenantId,
                };

                // Track search request counter
                metrics.searchRequests.inc({
                    tenant_id: activeTenantId,
                    search_type: 'semantic',
                });

                const result = await service.semanticSearch(searchQuery);

                // Return consistent format with pagination info
                const response = {
                    total: result.items.length,
                    items: result.items.map((item) => ({
                        id: item.documentId,
                        title: item.documentTitle || 'Untitled',
                        snippet: item.content,
                        score: item.rerankScore,
                    })),
                    page: 1,
                    pageSize: searchQuery.k,
                };

                // Track successful search duration
                const duration = (Date.now() - startTime) / 1000;
                metrics.searchDuration.observe(
                    {
                        tenant_id: activeTenantId,
                        search_type: 'semantic',
                        status: 'success',
                    },
                    duration
                );

                res.json(response);
            } catch (error: unknown) {
                // Track failed search duration
                const duration = (Date.now() - startTime) / 1000;
                const authReq = req as AuthenticatedRequest;
                metrics.searchDuration.observe(
                    {
                        tenant_id:
                            authReq.session?.currentTenantId ?? 'unknown',
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

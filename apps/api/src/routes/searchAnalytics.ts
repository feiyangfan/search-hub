import { Router } from 'express';
import { type z } from 'zod';

import {
    RecentSearchesQuery,
    TopQueriesQuery,
    SearchAnalyticsQuery,
    VolumeTimeSeriesQuery,
    SearchAnalyticsDetailQuery,
    AppError,
    QualityTimeSeriesQuery,
} from '@search-hub/schemas';

import { validateQuery } from '../middleware/validateMiddleware.js';
import type { RequestWithValidatedQuery } from './types.js';
import { type AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { searchAnalyticsService } from '../services/searchAnalyticsService.js';

export function searchAnalyticsRoutes() {
    const router = Router();

    /**
     * GET /recent - Get recent unique searches for current user
     * Used by Quick Search card to show recent search history
     */
    router.get(
        '/recent',
        validateQuery(RecentSearchesQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;
                const userId = authReq.session?.userId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'recent',
                            },
                        }
                    );
                }

                if (!userId) {
                    throw AppError.validation(
                        'NO_USER_ID',
                        'User ID not found in session.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'recent',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof RecentSearchesQuery>
                    >
                ).validated.query;

                const response = await searchAnalyticsService.getRecentSearches(
                    tenantId,
                    userId,
                    query.limit
                );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    /**
     * GET /top-queries - Get most popular search queries
     * Used by Search Intelligence card
     */
    router.get(
        '/top-queries',
        validateQuery(TopQueriesQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'top-queries',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof TopQueriesQuery>
                    >
                ).validated.query;

                const response = await searchAnalyticsService.getTopQueries(
                    tenantId,
                    query.limit,
                    query.daysBack
                );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    /**
     * GET /metrics - Get search analytics metrics with optional comparison
     * Used by Search Intelligence card for overview metrics
     */
    router.get(
        '/metrics',
        validateQuery(SearchAnalyticsQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'metrics',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchAnalyticsQuery>
                    >
                ).validated.query;

                const response = await searchAnalyticsService.getAnalytics(
                    tenantId,
                    {
                        startDate: query.startDate,
                        endDate: query.endDate,
                        includeComparison: query.includeComparison,
                    }
                );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    /**
     * GET /volume - Get search volume time series
     * Used for charts showing search activity over time
     */
    router.get(
        '/volume',
        validateQuery(VolumeTimeSeriesQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'volume',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof VolumeTimeSeriesQuery>
                    >
                ).validated.query;

                const response =
                    await searchAnalyticsService.getVolumeTimeSeries(
                        tenantId,
                        query.startDate,
                        query.endDate,
                        query.granularity
                    );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    /**
     * GET /quality - Get success vs zero-result rate time series
     * Used for charts showing search quality over time
     */
    router.get(
        '/quality',
        validateQuery(QualityTimeSeriesQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'quality',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof QualityTimeSeriesQuery>
                    >
                ).validated.query;

                const response = await searchAnalyticsService.getQualityTimeSeries(
                    tenantId,
                    query.startDate,
                    query.endDate,
                    query.granularity
                );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    /**
     * GET /detail - Get comprehensive analytics with optional sections
     * Used for detailed analytics pages with performance, user behavior, and response time stats
     */
    router.get(
        '/detail',
        validateQuery(SearchAnalyticsDetailQuery),
        async (req, res, next) => {
            try {
                const authReq = req as AuthenticatedRequest;
                const tenantId = authReq.session?.currentTenantId;

                if (!tenantId) {
                    throw AppError.validation(
                        'NO_ACTIVE_TENANT',
                        'No active tenant selected.',
                        {
                            context: {
                                origin: 'server',
                                domain: 'search-analytics',
                                operation: 'detail',
                            },
                        }
                    );
                }

                const query = (
                    req as RequestWithValidatedQuery<
                        z.infer<typeof SearchAnalyticsDetailQuery>
                    >
                ).validated.query;

                const response =
                    await searchAnalyticsService.getDetailedAnalytics(
                        tenantId,
                        {
                            startDate: query.startDate,
                            endDate: query.endDate,
                            daysBack: query.daysBack,
                            searchType: query.searchType,
                            includePerformance: query.includePerformance,
                            includeUserBehavior: query.includeUserBehavior,
                            includeResponseTime: query.includeResponseTime,
                            topQueriesLimit: query.topQueriesLimit,
                            topUsersLimit: query.topUsersLimit,
                        }
                    );

                res.json(response);
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

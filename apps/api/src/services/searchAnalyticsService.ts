import { db } from '@search-hub/db';
import type {
    RecentSearchesResponse,
    TopQueriesResponse,
    SearchAnalyticsResponse,
    VolumeTimeSeriesResponse,
    SearchAnalyticsDetailResponse,
    SearchMetric,
} from '@search-hub/schemas';

/**
 * Format a number with commas (e.g., 1248 -> "1,248")
 */
function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format percentage (e.g., 94.2 -> "94.2%")
 */
function formatPercentage(pct: number): string {
    return `${pct.toFixed(1)}%`;
}

/**
 * Calculate trend between current and previous value
 */
function calculateTrend(
    current: number,
    previous: number
): { trend: string; trendUp: boolean } {
    if (previous === 0) {
        return { trend: '+0%', trendUp: true };
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '−';
    return {
        trend: `${sign}${Math.abs(change).toFixed(1)}%`,
        trendUp: change >= 0,
    };
}

/**
 * Get time ranges for current and previous periods
 */
function getTimeRanges(daysBack: number) {
    const now = new Date();
    const currentEnd = now;
    const currentStart = new Date(
        now.getTime() - daysBack * 24 * 60 * 60 * 1000
    );
    const previousStart = new Date(
        currentStart.getTime() - daysBack * 24 * 60 * 60 * 1000
    );
    const previousEnd = currentStart;

    return {
        current: { startDate: currentStart, endDate: currentEnd },
        previous: { startDate: previousStart, endDate: previousEnd },
    };
}

export const searchAnalyticsService = {
    /**
     * Get recent unique searches for a user (Quick Search card)
     */
    async getRecentSearches(
        tenantId: string,
        userId: string,
        limit = 5
    ): Promise<RecentSearchesResponse> {
        const searches = await db.searchAnalytics.getRecentSearches(
            tenantId,
            userId,
            limit
        );

        return { searches };
    },

    /**
     * Get top search queries (Search Intelligence card)
     */
    async getTopQueries(
        tenantId: string,
        limit = 10,
        daysBack = 7
    ): Promise<TopQueriesResponse> {
        const queries = await db.searchAnalytics.getTopQueries(
            tenantId,
            limit,
            daysBack
        );

        return { queries };
    },

    /**
     * Get search analytics with optional comparison
     */
    async getAnalytics(
        tenantId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            daysBack?: number;
            includeComparison?: boolean;
        } = {}
    ): Promise<SearchAnalyticsResponse> {
        const {
            startDate,
            endDate,
            daysBack = 7,
            includeComparison = false,
        } = options;

        // Determine date ranges
        let currentRange, previousRange;
        if (startDate && endDate) {
            currentRange = { startDate, endDate };
            const duration = endDate.getTime() - startDate.getTime();
            previousRange = {
                startDate: new Date(startDate.getTime() - duration),
                endDate: startDate,
            };
        } else {
            const ranges = getTimeRanges(daysBack);
            currentRange = ranges.current;
            previousRange = ranges.previous;
        }

        // Get current metrics
        const currentMetrics = await db.searchAnalytics.getMetrics(
            tenantId,
            currentRange
        );

        let metrics: SearchMetric[] | undefined;

        if (includeComparison) {
            // Get previous metrics for comparison
            const previousMetrics = await db.searchAnalytics.getMetrics(
                tenantId,
                previousRange
            );

            // Calculate trends
            const searchesTrend = calculateTrend(
                currentMetrics.totalSearches,
                previousMetrics.totalSearches
            );
            const successTrend = calculateTrend(
                currentMetrics.successRate,
                previousMetrics.successRate
            );
            const p95Trend = calculateTrend(
                currentMetrics.p95Duration,
                previousMetrics.p95Duration
            );

            metrics = [
                {
                    label: 'Total searches',
                    value: formatNumber(currentMetrics.totalSearches),
                    trend: searchesTrend.trend,
                    trendUp: searchesTrend.trendUp,
                },
                {
                    label: 'P95 latency',
                    value: formatDuration(currentMetrics.p95Duration),
                    trend: p95Trend.trend,
                    trendUp: !p95Trend.trendUp, // Lower latency is better
                },
                {
                    label: 'Success rate',
                    value: formatPercentage(currentMetrics.successRate),
                    trend: successTrend.trend,
                    trendUp: successTrend.trendUp,
                },
            ];
        }

        return {
            totalSearches: currentMetrics.totalSearches,
            successRate: currentMetrics.successRate,
            avgDuration: currentMetrics.avgDuration,
            p95Duration: currentMetrics.p95Duration,
            searchTypeBreakdown: currentMetrics.searchTypeBreakdown,
            metrics,
        };
    },

    /**
     * Get volume time series for charts
     */
    async getVolumeTimeSeries(
        tenantId: string,
        startDate: Date,
        endDate: Date,
        granularity: 'hour' | 'day' = 'hour'
    ): Promise<VolumeTimeSeriesResponse> {
        const data = await db.searchAnalytics.getVolumeTimeSeries(
            tenantId,
            startDate,
            endDate,
            granularity
        );

        return { data };
    },

    /**
     * Get detailed analytics with optional sections
     */
    async getDetailedAnalytics(
        tenantId: string,
        options: {
            startDate?: Date;
            endDate?: Date;
            daysBack?: number;
            searchType?: 'lexical' | 'semantic' | 'hybrid';
            includePerformance?: boolean;
            includeUserBehavior?: boolean;
            includeResponseTime?: boolean;
            topQueriesLimit?: number;
            topUsersLimit?: number;
        } = {}
    ): Promise<SearchAnalyticsDetailResponse> {
        const {
            startDate,
            endDate,
            daysBack = 7,
            searchType,
            includePerformance = false,
            includeUserBehavior = false,
            includeResponseTime = false,
            topUsersLimit = 10,
        } = options;

        // Determine date ranges
        let currentRange;
        if (startDate && endDate) {
            currentRange = { startDate, endDate };
        } else {
            const ranges = getTimeRanges(daysBack);
            currentRange = ranges.current;
        }

        // Get core metrics (always included)
        const coreMetrics = await db.searchAnalytics.getMetrics(
            tenantId,
            currentRange
        );

        const response: SearchAnalyticsDetailResponse = {
            totalSearches: coreMetrics.totalSearches,
            successRate: coreMetrics.successRate,
            avgDuration: coreMetrics.avgDuration,
            p95Duration: coreMetrics.p95Duration,
            searchTypeBreakdown: coreMetrics.searchTypeBreakdown,
        };

        // Optional: Performance by search type
        if (includePerformance) {
            response.performance =
                await db.searchAnalytics.getPerformanceByType(
                    tenantId,
                    currentRange
                );
        }

        // Optional: User behavior
        if (includeUserBehavior) {
            const userBehavior = await db.searchAnalytics.getUserBehavior(
                tenantId,
                daysBack,
                topUsersLimit
            );

            // Cast favoriteSearchType to proper union type
            response.userBehavior = {
                ...userBehavior,
                topSearchers: userBehavior.topSearchers.map((searcher) => ({
                    ...searcher,
                    favoriteSearchType: searcher.favoriteSearchType as
                        | 'lexical'
                        | 'semantic'
                        | 'hybrid'
                        | undefined,
                })),
            };
        }

        // Optional: Response time details
        if (includeResponseTime) {
            response.responseTime =
                await db.searchAnalytics.getResponseTimeStats(
                    tenantId,
                    daysBack,
                    searchType
                );
        }

        return response;
    },
};

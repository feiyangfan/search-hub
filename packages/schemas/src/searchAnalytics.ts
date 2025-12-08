import { z } from 'zod';

// ---- Search Log Schemas ----

export const SearchTypeEnum = z.enum(['lexical', 'semantic', 'hybrid']);
export const SearchStatusEnum = z.enum(['success', 'error', 'partial']);

export type SearchType = z.infer<typeof SearchTypeEnum>;
export type SearchStatus = z.infer<typeof SearchStatusEnum>;

// Recent searches for Quick Search card
export const RecentSearchesQuery = z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5).optional(),
});

export const RecentSearchesResponse = z.object({
    searches: z.array(z.string()),
});

export type RecentSearchesQuery = z.infer<typeof RecentSearchesQuery>;
export type RecentSearchesResponse = z.infer<typeof RecentSearchesResponse>;

// Top queries for Search Intelligence card
export const TopQuery = z.object({
    query: z.string(),
    count: z.number().int().nonnegative(),
});

export const TopQueriesQuery = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
    daysBack: z.coerce.number().int().min(1).max(90).default(7).optional(),
});

export const TopQueriesResponse = z.object({
    queries: z.array(TopQuery),
});

export type TopQuery = z.infer<typeof TopQuery>;
export type TopQueriesQuery = z.infer<typeof TopQueriesQuery>;
export type TopQueriesResponse = z.infer<typeof TopQueriesResponse>;

// Search analytics metrics for dashboard
export const SearchAnalyticsQuery = z.object({
    // Time range for current period
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    // Whether to include comparison with previous period
    includeComparison: z.coerce.boolean().default(false).optional(),
});

export const SearchMetric = z.object({
    label: z.string(),
    value: z.string(), // formatted value (e.g., "1,248", "680ms", "94.2%")
    trend: z.string().optional(), // e.g., "+12%", "−6%"
    trendUp: z.boolean().optional(), // true if trending up
    zeroResultCount: z.number().int().nonnegative().optional(),
    zeroResultRate: z.number().min(0).max(100).optional(), // percentage
});

export const SearchTypeBreakdown = z.object({
    lexical: z.number().int().nonnegative().default(0),
    semantic: z.number().int().nonnegative().default(0),
    hybrid: z.number().int().nonnegative().default(0),
});

export const SearchAnalyticsResponse = z.object({
    totalSearches: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(100), // percentage
    avgDuration: z.number().nonnegative(), // milliseconds
    p95Duration: z.number().nonnegative(), // milliseconds
    zeroResultCount: z.number().int().nonnegative().default(0),
    zeroResultRate: z.number().min(0).max(100).default(0), // percentage
    searchTypeBreakdown: SearchTypeBreakdown,
    // Formatted metrics for UI display
    metrics: z.array(SearchMetric).optional(),
});

export type SearchAnalyticsQuery = z.infer<typeof SearchAnalyticsQuery>;
export type SearchAnalyticsResponse = z.infer<typeof SearchAnalyticsResponse>;
export type SearchMetric = z.infer<typeof SearchMetric>;
export type SearchTypeBreakdown = z.infer<typeof SearchTypeBreakdown>;

// Volume time series for charts
export const VolumeTimeSeriesQuery = z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    granularity: z.enum(['hour', 'day']).default('hour').optional(),
});

export const VolumeDataPoint = z.object({
    timestamp: z.date(),
    count: z.number().int().nonnegative(),
});

export const VolumeTimeSeriesResponse = z.object({
    data: z.array(VolumeDataPoint),
});

export type VolumeTimeSeriesQuery = z.infer<typeof VolumeTimeSeriesQuery>;
export type VolumeDataPoint = z.infer<typeof VolumeDataPoint>;
export type VolumeTimeSeriesResponse = z.infer<typeof VolumeTimeSeriesResponse>;

// Quality time series for charts (success vs zero-result)
export const QualityTimeSeriesQuery = z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    granularity: z.enum(['hour', 'day']).default('day').optional(),
});

export const QualityDataPoint = z.object({
    timestamp: z.date(),
    successRate: z.number().min(0).max(100),
    zeroResultRate: z.number().min(0).max(100),
    totalSearches: z.number().int().nonnegative().optional(),
});

export const QualityTimeSeriesResponse = z.object({
    data: z.array(QualityDataPoint),
});

export type QualityTimeSeriesQuery = z.infer<typeof QualityTimeSeriesQuery>;
export type QualityDataPoint = z.infer<typeof QualityDataPoint>;
export type QualityTimeSeriesResponse = z.infer<typeof QualityTimeSeriesResponse>;

// ---- Combined Analytics Endpoint ----

// Single comprehensive query schema for all analytics
export const SearchAnalyticsDetailQuery = z.object({
    // Time range
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    daysBack: z.coerce.number().int().min(1).max(90).default(7).optional(),

    // Filters
    searchType: SearchTypeEnum.optional(),

    // Options for what to include
    includeComparison: z.coerce.boolean().default(false).optional(),
    includePerformance: z.coerce.boolean().default(false).optional(),
    includeUserBehavior: z.coerce.boolean().default(false).optional(),
    includeResponseTime: z.coerce.boolean().default(false).optional(),

    // Limits
    topQueriesLimit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .optional(),
    topUsersLimit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .optional(),
});

// Performance by search type
export const SearchTypePerformance = z.object({
    searchType: SearchTypeEnum,
    totalSearches: z.number().int().nonnegative(),
    avgDuration: z.number().nonnegative(), // milliseconds
    p95Duration: z.number().nonnegative(),
    successRate: z.number().min(0).max(100),
});

// User behavior data
export const TopSearcher = z.object({
    userId: z.string(),
    userName: z.string().optional(),
    searchCount: z.number().int().nonnegative(),
    avgDuration: z.number().nonnegative(),
    favoriteSearchType: SearchTypeEnum.optional(),
});

export const PeakSearchTime = z.object({
    hour: z.number().int().min(0).max(23), // 0-23 hour of day
    searchCount: z.number().int().nonnegative(),
});

// Response time distribution
export const ResponseTimeBucket = z.object({
    bucket: z.string(), // e.g., "0-100ms", "100-500ms", "500-1000ms", "1000-2000ms", "2000ms+"
    count: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
});

export const ResponseTimeStats = z.object({
    distribution: z.array(ResponseTimeBucket),
    p50: z.number().nonnegative(),
    p75: z.number().nonnegative(),
    p90: z.number().nonnegative(),
    p95: z.number().nonnegative(),
    p99: z.number().nonnegative(),
    slowestQueries: z
        .array(
            z.object({
                query: z.string(),
                duration: z.number().nonnegative(),
                timestamp: z.date(),
            })
        )
        .optional(),
});

// Comprehensive analytics response
export const SearchAnalyticsDetailResponse = z.object({
    // Core metrics (always included)
    totalSearches: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(100),
    avgDuration: z.number().nonnegative(),
    p95Duration: z.number().nonnegative(),
    searchTypeBreakdown: SearchTypeBreakdown,

    // Optional sections based on query flags
    performance: z.array(SearchTypePerformance).optional(),
    userBehavior: z
        .object({
            topSearchers: z.array(TopSearcher),
            peakTimes: z.array(PeakSearchTime),
            uniqueSearchers: z.number().int().nonnegative(),
            searchesPerUser: z.number().nonnegative(),
        })
        .optional(),
    responseTime: ResponseTimeStats.optional(),
});

export type SearchAnalyticsDetailQuery = z.infer<
    typeof SearchAnalyticsDetailQuery
>;
export type SearchTypePerformance = z.infer<typeof SearchTypePerformance>;
export type TopSearcher = z.infer<typeof TopSearcher>;
export type PeakSearchTime = z.infer<typeof PeakSearchTime>;
export type ResponseTimeBucket = z.infer<typeof ResponseTimeBucket>;
export type ResponseTimeStats = z.infer<typeof ResponseTimeStats>;
export type SearchAnalyticsDetailResponse = z.infer<
    typeof SearchAnalyticsDetailResponse
>;

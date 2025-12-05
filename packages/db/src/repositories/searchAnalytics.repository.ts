import { prisma } from '../client.js';

export interface AnalyticsDateRange {
    startDate: Date;
    endDate: Date;
}

export interface TopQuery {
    query: string;
    count: number;
}

export interface SearchMetrics {
    totalSearches: number;
    successRate: number; // percentage
    avgDuration: number; // milliseconds
    p95Duration: number; // milliseconds
    searchTypeBreakdown: {
        lexical: number;
        semantic: number;
        hybrid: number;
    };
}

export interface SearchTypePerformance {
    searchType: 'lexical' | 'semantic' | 'hybrid';
    totalSearches: number;
    avgDuration: number;
    p95Duration: number;
    successRate: number;
}

export interface TopSearcher {
    userId: string;
    userName?: string;
    searchCount: number;
    avgDuration: number;
    favoriteSearchType?: string;
}

export interface PeakSearchTime {
    hour: number; // 0-23
    searchCount: number;
}

export interface ResponseTimeBucket {
    bucket: string;
    count: number;
    percentage: number;
}

export const searchAnalyticsRepository = {
    /**
     * Get unique recent searches for a user (for Quick Search card)
     */
    async getRecentSearches(
        tenantId: string,
        userId: string,
        limit = 5
    ): Promise<string[]> {
        const logs = await prisma.searchLog.findMany({
            where: {
                tenantId,
                userId,
                query: {
                    not: '',
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                query: true,
                createdAt: true,
            },
            take: limit * 3, // Get more to ensure unique
        });

        // Get unique queries (case-insensitive)
        const uniqueQueries = new Map<string, Date>();
        for (const log of logs) {
            const normalized = log.query.toLowerCase().trim();
            if (normalized.length >= 2 && !uniqueQueries.has(normalized)) {
                uniqueQueries.set(normalized, log.createdAt);
            }
        }

        return Array.from(uniqueQueries.entries())
            .sort((a, b) => b[1].getTime() - a[1].getTime())
            .slice(0, limit)
            .map(([query]) => query);
    },

    /**
     * Get top search queries (for Search Intelligence card)
     */
    async getTopQueries(
        tenantId: string,
        limit = 10,
        daysBack = 7
    ): Promise<TopQuery[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const results = await prisma.$queryRaw<TopQuery[]>`
                SELECT 
                    LOWER(TRIM(query)) as query,
                    COUNT(*)::int as count
                FROM "SearchLog"
                WHERE 
                    "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                    AND LENGTH(TRIM(query)) >= 2
                GROUP BY LOWER(TRIM(query))
                ORDER BY count DESC
                LIMIT ${limit}
            `;

        return results;
    },

    /**
     * Get core search metrics
     */
    async getMetrics(
        tenantId: string,
        dateRange: AnalyticsDateRange
    ): Promise<SearchMetrics> {
        const { startDate, endDate } = dateRange;

        const searches = await prisma.searchLog.findMany({
            where: {
                tenantId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                duration: true,
                status: true,
                searchType: true,
            },
        });

        const total = searches.length;

        if (total === 0) {
            return {
                totalSearches: 0,
                successRate: 0,
                avgDuration: 0,
                p95Duration: 0,
                searchTypeBreakdown: { lexical: 0, semantic: 0, hybrid: 0 },
            };
        }

        // Calculate success rate
        const successful = searches.filter(
            (s) => s.status === 'success'
        ).length;
        const successRate = (successful / total) * 100;

        // Calculate durations
        const durations = searches.map((s) => s.duration).sort((a, b) => a - b);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / total;
        const p95Index = Math.floor(durations.length * 0.95);
        const p95Duration = durations[p95Index] || 0;

        // Search type breakdown
        const breakdown = { lexical: 0, semantic: 0, hybrid: 0 };
        for (const search of searches) {
            if (search.searchType in breakdown) {
                breakdown[search.searchType as keyof typeof breakdown]++;
            }
        }

        return {
            totalSearches: total,
            successRate,
            avgDuration,
            p95Duration,
            searchTypeBreakdown: breakdown,
        };
    },

    /**
     * Get metrics comparison for trend calculation
     */
    async getMetricsComparison(
        tenantId: string,
        currentRange: AnalyticsDateRange,
        previousRange: AnalyticsDateRange
    ) {
        const [current, previous] = await Promise.all([
            this.getMetrics(tenantId, currentRange),
            this.getMetrics(tenantId, previousRange),
        ]);

        const calculateTrend = (curr: number, prev: number) => {
            if (prev === 0) return { value: curr, trend: '+0%', trendUp: true };
            const change = ((curr - prev) / prev) * 100;
            const sign = change >= 0 ? '+' : '−';
            return {
                value: curr,
                trend: `${sign}${Math.abs(change).toFixed(1)}%`,
                trendUp: change >= 0,
            };
        };

        return {
            totalSearches: calculateTrend(
                current.totalSearches,
                previous.totalSearches
            ),
            successRate: calculateTrend(
                current.successRate,
                previous.successRate
            ),
            p95Duration: calculateTrend(
                current.p95Duration,
                previous.p95Duration
            ),
        };
    },

    /**
     * Get search volume time series for charts
     */
    async getVolumeTimeSeries(
        tenantId: string,
        startDate: Date,
        endDate: Date,
        granularity: 'hour' | 'day' = 'hour'
    ) {
        const truncFunc = granularity === 'hour' ? 'hour' : 'day';

        const results = await prisma.$queryRaw<
            { timestamp: Date; count: bigint }[]
        >`
                SELECT 
                    DATE_TRUNC(${truncFunc}, "createdAt") as timestamp,
                    COUNT(*) as count
                FROM "SearchLog"
                WHERE 
                    "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                    AND "createdAt" <= ${endDate}
                GROUP BY timestamp
                ORDER BY timestamp ASC
            `;

        return results.map((r) => ({
            timestamp: r.timestamp,
            count: Number(r.count),
        }));
    },

    /**
     * Get performance breakdown by search type
     */
    async getPerformanceByType(
        tenantId: string,
        dateRange: AnalyticsDateRange
    ): Promise<SearchTypePerformance[]> {
        const { startDate, endDate } = dateRange;

        const results = await prisma.$queryRaw<
            {
                searchType: string;
                totalSearches: bigint;
                avgDuration: number;
                successCount: bigint;
                durations: number[];
            }[]
        >`
                SELECT 
                    "searchType",
                    COUNT(*)::bigint as "totalSearches",
                    AVG(duration)::float as "avgDuration",
                    COUNT(*) FILTER (WHERE status = 'success')::bigint as "successCount",
                    ARRAY_AGG(duration ORDER BY duration) as durations
                FROM "SearchLog"
                WHERE 
                    "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                    AND "createdAt" <= ${endDate}
                GROUP BY "searchType"
            `;

        return results.map((r) => {
            const total = Number(r.totalSearches);
            const durations = r.durations || [];
            const p95Index = Math.floor(durations.length * 0.95);

            return {
                searchType: r.searchType as 'lexical' | 'semantic' | 'hybrid',
                totalSearches: total,
                avgDuration: Math.round(r.avgDuration || 0),
                p95Duration: durations[p95Index] || 0,
                successRate:
                    total > 0 ? (Number(r.successCount) / total) * 100 : 0,
            };
        });
    },

    /**
     * Get user behavior analytics
     */
    async getUserBehavior(tenantId: string, daysBack = 30, limit = 10) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        // Top searchers
        const topSearchers = await prisma.$queryRaw<
            {
                userId: string;
                userName: string | null;
                searchCount: bigint;
                avgDuration: number;
                favoriteSearchType: string | null;
            }[]
        >`
                SELECT 
                    sl."userId",
                    u.name as "userName",
                    COUNT(*)::bigint as "searchCount",
                    AVG(sl.duration)::float as "avgDuration",
                    MODE() WITHIN GROUP (ORDER BY sl."searchType") as "favoriteSearchType"
                FROM "SearchLog" sl
                JOIN "User" u ON sl."userId" = u.id
                WHERE 
                    sl."tenantId" = ${tenantId}
                    AND sl."createdAt" >= ${startDate}
                GROUP BY sl."userId", u.name
                ORDER BY "searchCount" DESC
                LIMIT ${limit}
            `;

        // Peak search times
        const peakTimes = await prisma.$queryRaw<
            { hour: number; searchCount: bigint }[]
        >`
                SELECT 
                    EXTRACT(HOUR FROM "createdAt")::int as hour,
                    COUNT(*)::bigint as "searchCount"
                FROM "SearchLog"
                WHERE 
                    "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                GROUP BY hour
                ORDER BY "searchCount" DESC
            `;

        // Unique searchers and avg searches per user
        const stats = await prisma.$queryRaw<
            { uniqueSearchers: bigint; totalSearches: bigint }[]
        >`
                SELECT 
                    COUNT(DISTINCT "userId")::bigint as "uniqueSearchers",
                    COUNT(*)::bigint as "totalSearches"
                FROM "SearchLog"
                WHERE 
                    "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
            `;

        const { uniqueSearchers, totalSearches } = stats[0] || {
            uniqueSearchers: 0n,
            totalSearches: 0n,
        };
        const searchesPerUser =
            Number(uniqueSearchers) > 0
                ? Number(totalSearches) / Number(uniqueSearchers)
                : 0;

        return {
            topSearchers: topSearchers.map((s) => ({
                userId: s.userId,
                userName: s.userName || undefined,
                searchCount: Number(s.searchCount),
                avgDuration: Math.round(s.avgDuration || 0),
                favoriteSearchType: s.favoriteSearchType || undefined,
            })),
            peakTimes: peakTimes.map((p) => ({
                hour: p.hour,
                searchCount: Number(p.searchCount),
            })),
            uniqueSearchers: Number(uniqueSearchers),
            searchesPerUser: Math.round(searchesPerUser * 10) / 10,
        };
    },

    /**
     * Get response time distribution
     */
    async getResponseTimeStats(
        tenantId: string,
        daysBack = 7,
        searchType?: 'lexical' | 'semantic' | 'hybrid'
    ) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        // Get all durations for percentile calculation
        const durations = searchType
            ? await prisma.$queryRaw<{ duration: number }[]>`
                SELECT duration
                FROM "SearchLog"
                WHERE "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                    AND "searchType" = ${searchType}
                ORDER BY duration
            `
            : await prisma.$queryRaw<{ duration: number }[]>`
                SELECT duration
                FROM "SearchLog"
                WHERE "tenantId" = ${tenantId}
                    AND "createdAt" >= ${startDate}
                ORDER BY duration
            `;

        if (durations.length === 0) {
            return {
                distribution: [],
                p50: 0,
                p75: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                slowestQueries: [],
            };
        }

        const durationValues = durations.map((d) => d.duration);
        const getPercentile = (p: number) => {
            const index = Math.floor(durationValues.length * p);
            return durationValues[index] || 0;
        };

        // Calculate distribution buckets
        const buckets = [
            { bucket: '0-100ms', min: 0, max: 100 },
            { bucket: '100-500ms', min: 100, max: 500 },
            { bucket: '500-1000ms', min: 500, max: 1000 },
            { bucket: '1000-2000ms', min: 1000, max: 2000 },
            { bucket: '2000ms+', min: 2000, max: Infinity },
        ];

        const distribution = buckets.map(({ bucket, min, max }) => {
            const count = durationValues.filter(
                (d) => d >= min && d < max
            ).length;
            return {
                bucket,
                count,
                percentage: (count / durationValues.length) * 100,
            };
        });

        // Get slowest queries
        const slowest = await prisma.searchLog.findMany({
            where: {
                tenantId,
                createdAt: { gte: startDate },
                ...(searchType && { searchType }),
            },
            orderBy: { duration: 'desc' },
            take: 5,
            select: {
                query: true,
                duration: true,
                createdAt: true,
            },
        });

        return {
            distribution,
            p50: getPercentile(0.5),
            p75: getPercentile(0.75),
            p90: getPercentile(0.9),
            p95: getPercentile(0.95),
            p99: getPercentile(0.99),
            slowestQueries: slowest.map((s) => ({
                query: s.query,
                duration: s.duration,
                timestamp: s.createdAt,
            })),
        };
    },
};

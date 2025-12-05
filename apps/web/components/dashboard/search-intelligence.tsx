'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchVolumeChart } from './search-volume-chart';
import { Search, Zap, Target } from 'lucide-react';
import {
    useSearchAnalyticsQuery,
    useTopQueriesQuery,
} from '@/hooks/use-dashboard';
import type { SearchMetric } from '@search-hub/schemas';

interface SearchIntelligenceProps {
    tenantId: string | undefined;
}

function MetricSkeleton() {
    return (
        <div className="rounded-lg border border-border/40 bg-card shadow-sm p-2.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-2 w-16 rounded" />
            </div>
            <Skeleton className="h-6 w-12 rounded mb-1" />
            <Skeleton className="h-2 w-10 rounded" />
        </div>
    );
}

function TopQuerySkeleton() {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card shadow-sm px-2.5 py-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Skeleton className="h-3 w-4 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="h-4 w-8 rounded" />
        </div>
    );
}

export function SearchIntelligence({ tenantId }: SearchIntelligenceProps) {
    const { data: analyticsData, isLoading: isLoadingAnalytics } =
        useSearchAnalyticsQuery(tenantId);
    const { data: topQueriesData, isLoading: isLoadingQueries } =
        useTopQueriesQuery(tenantId, 5);

    console.log('analyticsData', analyticsData);
    console.log('topQueriesData', topQueriesData);

    const isLoading = isLoadingAnalytics || isLoadingQueries;

    const metrics = analyticsData?.metrics || [];
    const topQueries = topQueriesData?.queries || [];
    const getTrendColor = (metric: SearchMetric) => {
        if (!metric.trend || metric.trendUp === undefined) {
            return 'text-muted-foreground';
        }
        const isPositive =
            (metric.trendUp && metric.trend.startsWith('+')) ||
            (!metric.trendUp && metric.trend.startsWith('−'));
        return isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400';
    };

    const getMetricIcon = (label: string) => {
        const iconProps = {
            className: 'h-4 w-4 shrink-0 text-muted-foreground',
        };
        if (label.toLowerCase().includes('search')) {
            return <Search {...iconProps} />;
        }
        if (
            label.toLowerCase().includes('latency') ||
            label.toLowerCase().includes('speed')
        ) {
            return <Zap {...iconProps} />;
        }
        if (
            label.toLowerCase().includes('success') ||
            label.toLowerCase().includes('rate')
        ) {
            return <Target {...iconProps} />;
        }
        return <Search {...iconProps} />;
    };

    if (isLoading || metrics.length === 0) {
        return (
            <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                    <div className="flex gap-2 shrink-0">
                        <MetricSkeleton />
                        <MetricSkeleton />
                        <MetricSkeleton />
                    </div>
                    <div className="border-t border-border/40 pt-3 flex-1 flex flex-col min-h-0">
                        <h4 className="text-xs font-semibold tracking-tight mb-2 text-foreground shrink-0">
                            Top Search Queries
                        </h4>
                        <div className="space-y-1.5 flex-1 min-h-0">
                            <TopQuerySkeleton />
                            <TopQuerySkeleton />
                            <TopQuerySkeleton />
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold pb-4">
                        Search Volume
                    </h5>
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
            {/* Left side - Metrics + Top Queries */}
            <div className="flex flex-col gap-3 flex-1 min-h-0">
                {/* Primary Metrics */}
                <div className="flex gap-2 shrink-0">
                    {metrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="rounded-lg border border-border/40 bg-card shadow-sm p-2.5 flex-1 flex flex-col justify-center"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                {getMetricIcon(metric.label)}
                                <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground font-medium">
                                    {metric.label}
                                </p>
                            </div>
                            <p className="text-xl font-bold">{metric.value}</p>
                            <p
                                className={`text-[0.65rem] font-medium ${getTrendColor(
                                    metric
                                )}`}
                                title="Compared to previous 7-day period"
                            >
                                {metric.trend}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Top Search Queries */}
                <div className="border-t border-border/40 pt-3 flex-1 flex flex-col min-h-0">
                    <h4 className="text-xs font-semibold tracking-tight mb-2 text-foreground shrink-0">
                        Top Search Queries
                    </h4>
                    <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                        {topQueries.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-border/30 bg-card shadow-sm px-2.5 py-1.5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-[0.65rem] font-medium text-muted-foreground">
                                        {idx + 1}
                                    </span>
                                    <p className="text-[0.65rem] font-medium truncate">
                                        "{item.query}"
                                    </p>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="text-[0.65rem] h-4 px-1.5"
                                >
                                    {item.count}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right side - Chart */}
            <div className="flex-1 min-w-0">
                <h5 className="text-sm font-semibold pb-4">Search Volume</h5>
                <SearchVolumeChart />
            </div>
        </div>
    );
}

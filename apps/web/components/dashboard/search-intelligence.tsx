import { Badge } from '@/components/ui/badge';
import { SearchVolumeChart } from './search-volume-chart';
import { Search, Zap, Target } from 'lucide-react';

interface MetricData {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
}

interface TopQuery {
    query: string;
    count: number;
}

interface SearchIntelligenceProps {
    metrics: MetricData[];
    topQueries: TopQuery[];
}

export function SearchIntelligence({
    metrics,
    topQueries,
}: SearchIntelligenceProps) {
    const getTrendColor = (metric: MetricData) => {
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

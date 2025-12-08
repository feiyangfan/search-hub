'use client';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList,
} from 'recharts';

interface SearchQualityChartProps {
    successRate?: number;
    zeroResultRate?: number;
    isLoading?: boolean;
}

/**
 * Simple quality snapshot comparing success vs zero-result rate.
 * Shows percentages on a 0-100 scale for quick health checks.
 */
export function SearchQualityChart({
    successRate,
    zeroResultRate,
    isLoading,
}: SearchQualityChartProps) {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-sm text-muted-foreground">
                Loading chart data...
            </div>
        );
    }

    if (
        successRate === undefined ||
        successRate === null ||
        zeroResultRate === undefined ||
        zeroResultRate === null
    ) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-sm text-muted-foreground">
                No quality data available yet
            </div>
        );
    }

    const chartData = [
        { label: 'Success rate', value: successRate },
        { label: 'Zero-result rate', value: zeroResultRate },
    ];

    return (
        <div className="w-full h-64 [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        horizontal={false}
                    />
                    <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={120}
                    />
                    <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                        labelStyle={{
                            color: 'hsl(var(--popover-foreground))',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                        }}
                        itemStyle={{
                            color: 'hsl(var(--popover-foreground))',
                            fontSize: '0.875rem',
                        }}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                        }}
                    />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 4, 4]}
                        fill="#6366f1"
                        maxBarSize={26}
                    >
                        <LabelList
                            dataKey="value"
                            position="right"
                            formatter={(v: number) => `${v.toFixed(1)}%`}
                            className="fill-foreground text-xs"
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

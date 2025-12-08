'use client';

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import type { QualityDataPoint } from '@search-hub/schemas';

interface SearchQualityLineChartProps {
    data?: QualityDataPoint[];
    isLoading?: boolean;
}

function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
}

function formatDateLabel(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

export function SearchQualityLineChart({
    data,
    isLoading,
}: SearchQualityLineChartProps) {
    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-sm text-muted-foreground">
                Loading chart data...
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center text-sm text-muted-foreground">
                No search data available yet
            </div>
        );
    }

    const chartData = data.map((point) => ({
        timestamp: point.timestamp,
        date: formatDate(point.timestamp),
        successRate: point.successRate,
        zeroResultRate: point.zeroResultRate,
        label: formatDateLabel(point.timestamp),
    }));

    return (
        <div className="w-full h-64 [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                    />
                    <XAxis
                        dataKey="date"
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={40}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            padding: '0.5rem',
                        }}
                        labelStyle={{
                            color: 'hsl(var(--popover-foreground))',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                        }}
                        itemStyle={{
                            color: 'hsl(var(--popover-foreground))',
                            fontSize: '0.875rem',
                        }}
                        formatter={(value: number, name) => [
                            `${value.toFixed(1)}%`,
                            name === 'successRate'
                                ? 'Success rate'
                                : 'Zero-result rate',
                        ]}
                        labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                                return payload[0].payload.label;
                            }
                            return label;
                        }}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '0.75rem', paddingBottom: 8 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="successRate"
                        name="Success rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{
                            fill: '#10b981',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                            r: 4,
                        }}
                        activeDot={{
                            r: 5,
                            fill: '#10b981',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                        }}
                        connectNulls
                        isAnimationActive
                    />
                    <Line
                        type="monotone"
                        dataKey="zeroResultRate"
                        name="Zero-result rate"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{
                            fill: '#f97316',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                            r: 4,
                        }}
                        activeDot={{
                            r: 5,
                            fill: '#f97316',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                        }}
                        connectNulls
                        isAnimationActive
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

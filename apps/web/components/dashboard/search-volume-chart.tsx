'use client';

import * as React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Placeholder data for 7-day search volume
const searchVolumeData = [
    { date: 'Mon', searches: 142, label: 'Mon, Oct 30' },
    { date: 'Tue', searches: 178, label: 'Tue, Oct 31' },
    { date: 'Wed', searches: 195, label: 'Wed, Nov 1' },
    { date: 'Thu', searches: 163, label: 'Thu, Nov 2' },
    { date: 'Fri', searches: 204, label: 'Fri, Nov 3' },
    { date: 'Sat', searches: 87, label: 'Sat, Nov 4' },
    { date: 'Sun', searches: 112, label: 'Sun, Nov 5' },
];

export function SearchVolumeChart() {
    return (
        <div className="w-full h-64 [&_svg]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={searchVolumeData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
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
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        width={35}
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
                        formatter={(value: number) => [
                            `${value} searches`,
                            'Volume',
                        ]}
                        labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                                return payload[0].payload.label;
                            }
                            return label;
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="searches"
                        stroke="#555555"
                        strokeWidth={2}
                        dot={{
                            fill: '#555555',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                            r: 4,
                        }}
                        activeDot={{
                            r: 5,
                            fill: '#555555',
                            stroke: '#ffffff',
                            strokeWidth: 1,
                        }}
                        connectNulls={true}
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

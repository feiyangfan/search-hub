'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
    children: React.ReactNode;
    className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
    return (
        <div
            className={cn(
                // 6x6 grid system for finer control
                'grid gap-4',
                'grid-cols-1', // 1 column on mobile
                'md:grid-cols-3', // 3 columns on tablet
                'lg:grid-cols-6', // 6 columns on desktop
                // Auto rows on mobile, fixed rows on desktop
                'auto-rows-auto',
                'lg:grid-rows-6',
                className
            )}
        >
            {children}
        </div>
    );
}

// Grid item component with size variants for 6x6 grid
interface DashboardGridItemProps {
    children: React.ReactNode;
    // Width in terms of grid columns (1-6)
    colSpan?: 1 | 2 | 3 | 4 | 5 | 6;
    // Height in terms of grid rows (1-6)
    rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
    className?: string;
}

export function DashboardGridItem({
    children,
    colSpan = 1,
    rowSpan = 1,
    className,
}: DashboardGridItemProps) {
    // Generate column span classes
    const colSpanClass = {
        1: 'col-span-1',
        2: 'col-span-1 md:col-span-2 lg:col-span-2',
        3: 'col-span-1 md:col-span-3 lg:col-span-3',
        4: 'col-span-1 md:col-span-3 lg:col-span-4',
        5: 'col-span-1 md:col-span-3 lg:col-span-5',
        6: 'col-span-1 md:col-span-3 lg:col-span-6',
    }[colSpan];

    // Generate row span classes (only on desktop)
    const rowSpanClass = {
        1: 'lg:row-span-1',
        2: 'lg:row-span-2',
        3: 'lg:row-span-3',
        4: 'lg:row-span-4',
        5: 'lg:row-span-5',
        6: 'lg:row-span-6',
    }[rowSpan];

    return (
        <div className={cn(colSpanClass, rowSpanClass, className)}>
            {children}
        </div>
    );
}

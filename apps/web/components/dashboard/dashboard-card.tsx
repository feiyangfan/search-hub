import * as React from 'react';

import { cn } from '@/lib/utils';

type DashboardCardVariant =
    | 'small'
    | 'medium'
    | 'large'
    | 'wide'
    | 'stacked'
    | 'optional'
    | 'auto';

const variantGridClasses: Record<DashboardCardVariant, string> = {
    small: 'lg:col-span-1 xl:col-span-3',
    medium: 'lg:col-span-1 xl:col-span-4',
    large: 'lg:col-span-2 xl:col-span-6',
    wide: 'lg:col-span-2 xl:col-span-12',
    stacked: 'lg:col-span-1 xl:col-span-5',
    optional: 'lg:col-span-1 xl:col-span-3',
    auto: 'col-span-1 lg:col-span-1 xl:col-span-auto',
};

interface DashboardCardProps extends React.HTMLAttributes<HTMLElement> {
    title: string;
    description?: string;
    eyebrow?: string;
    action?: React.ReactNode;
    footer?: React.ReactNode;
    variant?: DashboardCardVariant;
    accent?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const accentClasses: Record<
    NonNullable<DashboardCardProps['accent']>,
    string
> = {
    default: 'bg-card text-card-foreground border-border',
    success:
        'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800/60',
    warning:
        'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800/60',
    danger: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800/60',
    info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800/60',
};

export function DashboardCard({
    title,
    description,
    action,
    children,
    variant = 'medium',
    accent = 'default',
    className,
    ...props
}: DashboardCardProps) {
    const surfaceClass = accentClasses[accent] ?? accentClasses.default;

    return (
        <section
            className={cn(
                'flex flex-col rounded-xl border border-border/40 bg-card shadow-sm hover:shadow-md transition-all duration-200',
                surfaceClass,
                className
            )}
            {...props}
        >
            <div className="flex items-center justify-between px-4 pt-2 gap-4">
                <div className="header-section">
                    <h3 className="text-sm font-semibold tracking-tight">
                        {title}
                    </h3>
                    {description ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action ? <div className="action-section">{action}</div> : null}
            </div>

            <div className="flex-1 px-4 py-3 min-h-0">{children}</div>
        </section>
    );
}

import * as React from 'react';

import { cn } from '@/lib/utils';

type DashboardCardVariant =
    | 'small'
    | 'medium'
    | 'large'
    | 'wide'
    | 'stacked'
    | 'optional';

const variantGridClasses: Record<DashboardCardVariant, string> = {
    small: 'lg:col-span-1 xl:col-span-3',
    medium: 'lg:col-span-1 xl:col-span-4',
    large: 'lg:col-span-2 xl:col-span-6',
    wide: 'lg:col-span-2 xl:col-span-12',
    stacked: 'lg:col-span-1 xl:col-span-5',
    optional: 'lg:col-span-1 xl:col-span-3',
};

interface DashboardCardProps
    extends React.HTMLAttributes<HTMLElement> {
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
    danger:
        'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800/60',
    info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800/60',
};

export function DashboardCard({
    title,
    description,
    eyebrow,
    action,
    footer,
    children,
    variant = 'medium',
    accent = 'default',
    className,
    ...props
}: DashboardCardProps) {
    const gridClass = variantGridClasses[variant] ?? variantGridClasses.medium;
    const surfaceClass = accentClasses[accent] ?? accentClasses.default;

    return (
        <section
            className={cn(
                'flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-colors',
                surfaceClass,
                gridClass,
                className
            )}
            {...props}
        >
            <header className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
                <div className="space-y-1">
                    {eyebrow ? (
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground/70">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h3 className="text-base font-semibold">{title}</h3>
                    {description ? (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action ? (
                    <div className="shrink-0">{action}</div>
                ) : null}
            </header>
            <div className="flex-1 px-6 py-5">{children}</div>
            {footer ? (
                <footer className="border-t border-border/60 px-6 py-4 text-sm text-muted-foreground">
                    {footer}
                </footer>
            ) : null}
        </section>
    );
}

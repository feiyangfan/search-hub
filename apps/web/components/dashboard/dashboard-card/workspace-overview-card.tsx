'use client';
import { useWorkspaceOverviewQuery } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export interface WorkspaceOverviewCardProps {
    tenantId: string | undefined;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const formatNumber = (value?: number | null) =>
    numberFormatter.format(value ?? 0);

function StatSkeleton() {
    return (
        <div className="rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/40 p-3 shadow-sm">
            <div className="space-y-2">
                <Skeleton className="h-2 w-16 rounded bg-emerald-100/70" />
                <Skeleton className="h-6 w-20 rounded bg-emerald-200/80" />
                <Skeleton className="h-2 w-24 rounded bg-emerald-100/70" />
            </div>
        </div>
    );
}

export function WorkspaceOverviewCard({
    tenantId,
}: WorkspaceOverviewCardProps) {
    const { data, isLoading } = useWorkspaceOverviewQuery(tenantId);

    if (isLoading || !data) {
        return (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </div>
        );
    }

    const stats = [
        {
            label: 'Docs',
            value: formatNumber(data.documentCount),
            helper:
                (data.documentsCreatedThisWeek ?? 0) > 0
                    ? `+${formatNumber(
                          data.documentsCreatedThisWeek ?? 0
                      )} this week`
                    : 'No new files this week',
        },
        {
            label: 'Members',
            value: formatNumber(data.memberCount),
            helper: 'users',
        },
        {
            label: 'Tags',
            value: formatNumber(data.tagCount),
            helper:
                (data.tagCount ?? 0) > 0
                    ? 'Tags in use'
                    : 'Start tagging content',
        },
    ];

    return (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-2xl border border-dashed border-emerald-200/60 bg-emerald-50/50 p-4 text-left shadow-sm"
                >
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-emerald-700">
                        {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-900">
                        {stat.value}
                    </p>
                    <p className="mt-1 text-[0.7rem] font-medium text-emerald-600">
                        {stat.helper}
                    </p>
                </div>
            ))}
        </div>
    );
}

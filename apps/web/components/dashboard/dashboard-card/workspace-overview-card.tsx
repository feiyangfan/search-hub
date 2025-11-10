'use client';
import { useWorkspaceOverviewQuery } from '@/hooks/use-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export interface WorkspaceOverviewCardProps {
    tenantId: string | undefined;
}

function StatSkeleton() {
    return (
        <div className="space-y-1.5 rounded-lg border border-dashed border-emerald-200/60 p-2 items-center">
            <Skeleton className="h-2 w-4 rounded bg-emerald-100/50" />
            <Skeleton className="h-2 w-4 rounded bg-emerald-200/60" />
            <Skeleton className="h-2 w-4 rounded bg-emerald-100/50" />
        </div>
    );
}

export function WorkspaceOverviewCard({
    tenantId,
}: WorkspaceOverviewCardProps) {
    const { data, isLoading } = useWorkspaceOverviewQuery(tenantId);

    if (isLoading || !data) {
        return (
            <div className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </div>
        );
    }

    return (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="min-w-0 flex flex-col">
                <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wide">
                    Documents
                </p>
                <p className="flex text-xl font-bold">
                    <span className="text-emerald-800">
                        {data.documentCount}
                    </span>
                    <span className="ml-1 text-[0.6rem] font-medium leading-tight text-muted-foreground place-self-end">
                        +{data.documentsCreatedThisWeek ?? 0} this week
                    </span>
                </p>
            </div>
            <div className="min-w-0">
                <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wide">
                    Members
                </p>
                <p className="text-xl font-bold">
                    <span className="text-emerald-800">{data.memberCount}</span>
                </p>
            </div>
            <div className="min-w-0">
                <p className="text-[0.6rem] font-semibold text-muted-foreground uppercase tracking-wide">
                    Tags
                </p>
                <p className="flex text-xl font-bold">
                    <span className="text-emerald-800 ">{data.tagCount}</span>
                </p>
            </div>
        </div>
    );
}

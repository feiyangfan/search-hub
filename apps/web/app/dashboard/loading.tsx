import { DashboardGrid, DashboardGridItem } from '@/components/dashboard/dashboard-grid';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Skeleton } from '@/components/ui/skeleton';

const primarySkeleton = 'bg-emerald-200/60 dark:bg-emerald-900/40';
const subtleSkeleton = 'bg-emerald-100/50 dark:bg-emerald-950/30';

export default function DashboardLoading() {
    return (
        <div className="h-[calc(100vh-3.5rem)] w-full overflow-y-auto lg:overflow-hidden px-6 py-6">
            <DashboardGrid className="lg:h-full">
                {/* Quick Search */}
                <DashboardGridItem colSpan={2} rowSpan={1}>
                    <DashboardCard variant="medium" title="Quick Search" className="h-full">
                        <div className="flex gap-2">
                            <Skeleton className={`h-10 flex-1 rounded-md ${primarySkeleton}`} />
                            <Skeleton className={`h-10 w-24 rounded-md ${primarySkeleton}`} />
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Search Intelligence */}
                <DashboardGridItem colSpan={4} rowSpan={3}>
                    <DashboardCard
                        variant="large"
                        title="Search Intelligence"
                        description="Performance metrics"
                        action={
                            <Skeleton
                                className={`h-8 w-20 rounded-md ${primarySkeleton}`}
                            />
                        }
                        className="h-full"
                    >
                        <div className="flex h-full flex-col gap-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <div key={`metric-${idx}`} className="space-y-2 rounded-lg border border-dashed border-emerald-200/60 p-3">
                                        <Skeleton className={`h-3 w-24 rounded ${subtleSkeleton}`} />
                                        <Skeleton className={`h-6 w-20 rounded ${primarySkeleton}`} />
                                        <Skeleton className={`h-3 w-16 rounded ${subtleSkeleton}`} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 rounded-xl border border-dashed border-emerald-200/60 p-3">
                                <Skeleton className={`h-full w-full rounded-lg ${subtleSkeleton}`} />
                            </div>
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Workspace Overview */}
                <DashboardGridItem colSpan={2} rowSpan={1}>
                    <DashboardCard variant="medium" title="Workspace Overview" className="h-full">
                        <div className="grid w-full grid-cols-3 gap-3">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div key={`overview-${idx}`} className="space-y-1.5 rounded-lg border border-dashed border-emerald-200/60 p-3">
                                    <Skeleton className={`h-2.5 w-20 rounded ${subtleSkeleton}`} />
                                    <Skeleton className={`h-6 w-12 rounded ${primarySkeleton}`} />
                                    <Skeleton className={`h-2.5 w-16 rounded ${subtleSkeleton}`} />
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Reminders */}
                <DashboardGridItem colSpan={2} rowSpan={2}>
                    <DashboardCard
                        variant="medium"
                        title="Reminders"
                        description="Upcoming notifications"
                        action={<Skeleton className={`h-6 w-16 rounded-md ${primarySkeleton}`} />}
                        className="h-full"
                    >
                        <div className="flex min-h-0 flex-col gap-2">
                            {Array.from({ length: 3 }).map((_, idx) => (
                                <div
                                    key={`reminder-${idx}`}
                                    className="flex items-start gap-3 rounded-lg border border-dashed border-emerald-200/60 p-3"
                                >
                                    <Skeleton className={`h-6 w-6 rounded-full ${primarySkeleton}`} />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className={`h-3 w-40 rounded ${primarySkeleton}`} />
                                        <Skeleton className={`h-3 w-24 rounded ${subtleSkeleton}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Knowledge Network */}
                <DashboardGridItem colSpan={2} rowSpan={3}>
                    <DashboardCard
                        variant="medium"
                        title="Knowledge Network"
                        description="Document and tag relationships"
                        action={<Skeleton className={`h-6 w-16 rounded-md ${primarySkeleton}`} />}
                        className="h-full"
                    >
                        <div className="flex h-full items-center justify-center">
                            <Skeleton className={`h-64 w-full max-w-sm rounded-full ${subtleSkeleton}`} />
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Indexing Pipeline Status */}
                <DashboardGridItem colSpan={2} rowSpan={3}>
                    <DashboardCard
                        variant="large"
                        title="Indexing Pipeline Status"
                        description="Document processing and embedding generation"
                        action={<Skeleton className={`h-6 w-24 rounded-md ${primarySkeleton}`} />}
                        className="h-full"
                    >
                        <div className="flex h-full flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={`stat-${idx}`} className="space-y-1 rounded-lg border border-dashed border-emerald-200/60 p-3">
                                        <Skeleton className={`h-3 w-16 rounded ${subtleSkeleton}`} />
                                        <Skeleton className={`h-5 w-14 rounded ${primarySkeleton}`} />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                        key={`job-${idx}`}
                                        className="space-y-2 rounded-lg border border-dashed border-emerald-200/60 p-3"
                                    >
                                        <Skeleton className={`h-4 w-48 rounded ${primarySkeleton}`} />
                                        <Skeleton className={`h-3 w-40 rounded ${subtleSkeleton}`} />
                                        <Skeleton className={`h-2.5 w-full rounded ${subtleSkeleton}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Recent Activity */}
                <DashboardGridItem colSpan={2} rowSpan={2}>
                    <DashboardCard
                        variant="medium"
                        title="Recent Activity"
                        description="Latest workspace actions"
                        action={<Skeleton className={`h-6 w-16 rounded-md ${primarySkeleton}`} />}
                        className="h-full"
                    >
                        <div className="flex min-h-0 flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div
                                    key={`activity-${idx}`}
                                    className="flex items-start gap-3 rounded-lg border border-dashed border-emerald-200/60 p-2"
                                >
                                    <Skeleton className={`h-8 w-8 rounded-full ${primarySkeleton}`} />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className={`h-3 w-48 rounded ${primarySkeleton}`} />
                                        <Skeleton className={`h-3 w-32 rounded ${subtleSkeleton}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </DashboardGridItem>
            </DashboardGrid>
        </div>
    );
}

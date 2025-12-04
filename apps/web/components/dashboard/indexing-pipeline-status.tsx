'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    RotateCcw,
    XCircle,
    Cpu,
    Clock,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { useIndexingStatusQuery } from '@/hooks/use-dashboard';
import type { JobHistory } from '@search-hub/schemas';

export interface IndexingPipelineStatusProps {
    tenantId: string | undefined;
}

function StatSkeleton() {
    return (
        <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 min-w-0 space-y-1">
                    <Skeleton className="h-2 w-12 rounded" />
                    <Skeleton className="h-5 w-8 rounded" />
                </div>
            </div>
        </div>
    );
}

function JobSkeleton() {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-card shadow-sm p-1.5">
            <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-2 w-24 rounded" />
            </div>
        </div>
    );
}

export function IndexingPipelineStatus({
    tenantId,
}: IndexingPipelineStatusProps) {
    const { data, isLoading } = useIndexingStatusQuery(tenantId);

    if (isLoading || !data) {
        return (
            <div className="flex flex-col h-full min-h-0 gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 shrink-0">
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                    <StatSkeleton />
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                    <h4 className="text-[0.65rem] font-semibold tracking-tight mb-1.5 text-muted-foreground uppercase shrink-0">
                        Recent Jobs
                    </h4>
                    <div className="space-y-1.5 flex-1 min-h-0">
                        <JobSkeleton />
                        <JobSkeleton />
                        <JobSkeleton />
                    </div>
                </div>
            </div>
        );
    }

    const { stats, worker, recentJobs } = data;
    const showRetryAll = stats.failed > 0;

    // Display 3 most recent jobs
    const displayJobs = (recentJobs || []).slice(0, 3);

    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            {/* Status Summary Bar - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 shrink-0">
                {/* Failed Jobs */}
                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                    Failed
                                </p>
                                <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                    {stats.failed}
                                </p>
                            </div>
                        </div>
                    </div>
                    {stats.failed > 0 && showRetryAll && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1.5 text-[0.6rem] h-5"
                        >
                            <RotateCcw className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                            <span className="truncate">Retry All</span>
                        </Button>
                    )}
                </div>

                {/* Processing Jobs */}
                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Processing
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {stats.processing}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        Active: {worker.activeJobs}/{worker.maxConcurrency}
                    </p>
                </div>

                {/* Queued Jobs */}
                <div className="rounded-lg border border-border/60 bg-background/40 p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Queued
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {stats.queued}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        {worker.queueDepth} in queue
                    </p>
                </div>

                {/* Total Indexed */}
                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Indexed
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {stats.indexed}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        {stats.totalChunks} chunks
                    </p>
                </div>
            </div>

            {/* Recent Jobs List */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="text-[0.65rem] font-semibold tracking-tight mb-1.5 text-muted-foreground uppercase shrink-0">
                    Recent Jobs
                </h4>
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                    {displayJobs.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No recent jobs
                        </div>
                    ) : (
                        displayJobs.map((job: JobHistory) => {
                            // Override config if job is stuck
                            const isStuck = job.isStuck ?? false;

                            const statusConfig = {
                                failed: {
                                    label: 'Failed',
                                    variant: 'destructive' as const,
                                    showRetry: true,
                                    icon: XCircle,
                                    iconColor: 'text-destructive',
                                },
                                processing: {
                                    label: isStuck ? 'Stuck' : 'Processing',
                                    variant: isStuck
                                        ? ('destructive' as const)
                                        : ('secondary' as const),
                                    showRetry: isStuck,
                                    icon: Cpu,
                                    iconColor: 'text-muted-foreground',
                                },
                                queued: {
                                    label: isStuck ? 'Stuck' : 'Queued',
                                    variant: isStuck
                                        ? ('destructive' as const)
                                        : ('outline' as const),
                                    showRetry: isStuck,
                                    icon: Clock,
                                    iconColor: 'text-muted-foreground',
                                },
                                indexed: {
                                    label: 'Indexed',
                                    variant: 'default' as const,
                                    showRetry: false,
                                    icon: CheckCircle,
                                    iconColor: 'text-muted-foreground',
                                },
                            };
                            const config = statusConfig[job.status];
                            const Icon = config.icon;

                            return (
                                <div
                                    key={job.id}
                                    className="flex items-center gap-2 rounded-lg border border-border/30 bg-card shadow-sm p-1.5 hover:shadow-md transition-all"
                                >
                                    <Icon
                                        className={`h-4 w-4 shrink-0 ${config.iconColor}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1.5 mb-0.5 flex-wrap">
                                            <div className="flex gap-1.5">
                                                <p className="text-xs font-semibold text-foreground truncate min-w-0">
                                                    {job.documentTitle ||
                                                        'Untitled'}
                                                </p>
                                                <Badge
                                                    variant={config.variant}
                                                    className="text-[0.65rem] h-4 shrink-0"
                                                >
                                                    {config.label}
                                                </Badge>
                                            </div>
                                            <p className="text-[0.65rem] text-muted-foreground truncate">
                                                {job.error ||
                                                    (() => {
                                                        const parts: string[] =
                                                            [];

                                                        // Duration
                                                        if (
                                                            job.durationSeconds
                                                        ) {
                                                            parts.push(
                                                                `${job.durationSeconds.toFixed(
                                                                    1
                                                                )}s`
                                                            );
                                                        }

                                                        // Time ago
                                                        if (job.completedAt) {
                                                            const now =
                                                                Date.now();
                                                            const completed =
                                                                new Date(
                                                                    job.completedAt
                                                                ).getTime();
                                                            const diffMs =
                                                                now - completed;
                                                            const diffSec =
                                                                Math.floor(
                                                                    diffMs /
                                                                        1000
                                                                );

                                                            let timeAgo: string;
                                                            if (diffSec < 60) {
                                                                timeAgo = `${diffSec}s ago`;
                                                            } else if (
                                                                diffSec < 3600
                                                            ) {
                                                                timeAgo = `${Math.floor(
                                                                    diffSec / 60
                                                                )}m ago`;
                                                            } else if (
                                                                diffSec < 86400
                                                            ) {
                                                                timeAgo = `${Math.floor(
                                                                    diffSec /
                                                                        3600
                                                                )}h ago`;
                                                            } else {
                                                                timeAgo = `${Math.floor(
                                                                    diffSec /
                                                                        86400
                                                                )}d ago`;
                                                            }

                                                            parts.push(timeAgo);
                                                        }

                                                        return (
                                                            parts.join(' • ') ||
                                                            new Date(
                                                                job.updatedAt
                                                            ).toLocaleTimeString()
                                                        );
                                                    })()}
                                            </p>
                                        </div>
                                    </div>

                                    {config.showRetry && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0 h-6 text-[0.65rem] px-2 whitespace-nowrap"
                                        >
                                            Retry
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, XCircle, Loader2, Clock, CheckCircle } from 'lucide-react';

interface IndexingJob {
    id: string;
    documentName: string;
    status: 'failed' | 'processing' | 'queued' | 'indexed';
    statusLabel: string;
    icon: string;
    details: string;
    progress?: {
        current: number;
        total: number;
        percentage: number;
    };
    queuePosition?: number;
    hasAction?: boolean;
    actionLabel?: string;
}

interface IndexingStats {
    failed: number;
    processing: number;
    queued: number;
    indexed: number;
    activeWorkers?: {
        current: number;
        max: number;
    };
    queueWaitTime?: string;
    indexedToday?: number;
}

interface IndexingPipelineStatusProps {
    stats: IndexingStats;
    recentJobs: IndexingJob[];
    showRetryAll?: boolean;
}

export function IndexingPipelineStatus({
    stats,
    recentJobs,
    showRetryAll = false,
}: IndexingPipelineStatusProps) {
    const getJobBorderColor = (status: IndexingJob['status']) => {
        return 'border-border/50 bg-muted/20';
    };

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
                        <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Processing
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {stats.processing}
                            </p>
                        </div>
                    </div>
                    {stats.activeWorkers && (
                        <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                            Active: {stats.activeWorkers.current}/
                            {stats.activeWorkers.max}
                        </p>
                    )}
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
                    {stats.queueWaitTime && (
                        <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                            {stats.queueWaitTime} wait
                        </p>
                    )}
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
                    {stats.indexedToday !== undefined && (
                        <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                            +{stats.indexedToday} today
                        </p>
                    )}
                </div>
            </div>

            {/* Recent Jobs List */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="text-[0.65rem] font-semibold tracking-tight mb-1.5 text-muted-foreground uppercase shrink-0">
                    Recent Jobs
                </h4>
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                    {recentJobs.map((job) => (
                        <div
                            key={job.id}
                            className="flex items-center gap-2 rounded-lg border border-border/30 bg-card shadow-sm p-1.5 hover:shadow-md transition-all"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <p className="text-xs font-semibold text-foreground truncate min-w-0">
                                        {job.documentName}
                                    </p>
                                    <Badge
                                        variant="secondary"
                                        className="text-[0.65rem] h-4 shrink-0 bg-green-50"
                                    >
                                        {job.statusLabel}
                                    </Badge>
                                    {job.queuePosition && (
                                        <span className="text-[0.65rem] text-muted-foreground shrink-0 whitespace-nowrap">
                                            #{job.queuePosition} in queue
                                        </span>
                                    )}
                                </div>

                                {/* Progress bar for processing jobs */}
                                {job.progress && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden min-w-0">
                                            <div
                                                className="h-full bg-foreground rounded-full"
                                                style={{
                                                    width: `${job.progress.percentage}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="text-[0.65rem] text-muted-foreground shrink-0 whitespace-nowrap">
                                            {job.details}
                                        </p>
                                    </div>
                                )}

                                {/* Details for other job types */}
                                {!job.progress && (
                                    <p className="text-[0.65rem] text-muted-foreground truncate">
                                        {job.details}
                                    </p>
                                )}
                            </div>

                            {/* Action button (e.g., Retry) */}
                            {job.hasAction && job.actionLabel && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 h-6 text-[0.65rem] px-2 whitespace-nowrap"
                                >
                                    {job.actionLabel}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

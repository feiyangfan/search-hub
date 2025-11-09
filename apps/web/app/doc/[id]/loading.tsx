'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentLoading() {
    return (
        <div className="flex flex-1 flex-col bg-card">
            <div className="border-b border-border/60 bg-background/70 px-6 py-4">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-6 w-48 bg-emerald-200/60" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-5 w-20 rounded-full bg-emerald-200/60" />
                            <Skeleton className="h-5 w-16 rounded-full bg-emerald-200/60" />
                            <Skeleton className="h-5 w-24 rounded-full bg-emerald-200/60" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-20 rounded-md bg-emerald-200/60" />
                        <Skeleton className="h-8 w-20 rounded-md bg-emerald-200/60" />
                        <Skeleton className="h-8 w-8 rounded-md bg-emerald-200/60" />
                    </div>
                </div>
            </div>
            <div className="flex flex-1 flex-col px-6 py-4">
                <Skeleton className="mb-4 h-14 w-full rounded-md bg-emerald-200/60" />
                <Skeleton className="mb-4 h-6 w-3/5 bg-emerald-200/60" />
                <Skeleton className="mb-4 h-6 w-2/3 bg-emerald-200/60" />
                <Skeleton className="mb-4 h-6 w-full bg-emerald-200/60" />
                <Skeleton className="h-full w-full rounded-md bg-emerald-200/60" />
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    AlertCircle,
    ArrowUpRight,
    BellRing,
    CalendarClock,
    Inbox,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    ReminderItemType,
    ReminderStatusType,
    RemindCommandPayloadType,
} from '@search-hub/schemas';
import { usePendingRemindersQuery } from '@/hooks/use-reminders';

type NormalizedReminder = {
    id: string;
    documentId: string;
    documentTitle: string;
    status: ReminderStatusType;
    whenISO: string | null;
    whenText?: string;
    dueDate: Date | null;
    createdAt: Date | null;
};

const INITIAL_DIALOG_PAGE_SIZE = 5;

type RemindersCardContextValue = {
    query: ReturnType<typeof usePendingRemindersQuery>;
    prioritizedReminders: NormalizedReminder[];
    dialogOpen: boolean;
    openDialog: () => void;
    closeDialog: () => void;
    dialogVisibleCount: number;
    loadMore: () => void;
    initialCount?: number;
    tenantId?: string;
};

const RemindersCardContext = createContext<RemindersCardContextValue | null>(
    null
);

function useRemindersCardContext() {
    const ctx = useContext(RemindersCardContext);
    if (!ctx) {
        throw new Error(
            'RemindersCard components must be used within RemindersCardProvider'
        );
    }
    return ctx;
}

const statusPriority: ReminderStatusType[] = ['notified', 'scheduled'];
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
});
const preciseDateFormatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: 'numeric',
});
const weekdayFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'short',
});

export function RemindersCardProvider({
    children,
    initialCount,
    tenantId,
}: {
    children: ReactNode;
    initialCount?: number;
    tenantId?: string;
}) {
    const query = usePendingRemindersQuery(tenantId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogVisibleCount, setDialogVisibleCount] = useState(
        INITIAL_DIALOG_PAGE_SIZE
    );

    const prioritizedReminders = useMemo(
        () => prioritizeReminders(query.data ?? []),
        [query.data]
    );

    const openDialog = () => {
        setDialogVisibleCount(INITIAL_DIALOG_PAGE_SIZE);
        setDialogOpen(true);
    };

    const closeDialog = () => setDialogOpen(false);

    const loadMore = () => {
        setDialogVisibleCount((prev) => {
            if (prioritizedReminders.length <= prev) {
                return prev;
            }
            return Math.min(
                prev + INITIAL_DIALOG_PAGE_SIZE,
                prioritizedReminders.length
            );
        });
    };

    const value: RemindersCardContextValue = {
        query,
        prioritizedReminders,
        dialogOpen,
        openDialog,
        closeDialog,
        dialogVisibleCount,
        loadMore,
        initialCount,
        tenantId,
    };

    return (
        <RemindersCardContext.Provider value={value}>
            {children}
            <RemindersDialog />
        </RemindersCardContext.Provider>
    );
}

export function RemindersCardAction() {
    const { openDialog } = useRemindersCardContext();
    return (
        <Button variant="ghost" size="sm" onClick={openDialog}>
            View all
        </Button>
    );
}

export function RemindersCardContent() {
    const { query, prioritizedReminders } = useRemindersCardContext();
    const { isLoading, isError, refetch, isRefetching } = query;
    const reminders = useMemo(
        () => prioritizedReminders.slice(0, 3),
        [prioritizedReminders]
    );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {isLoading ? (
                <RemindersSkeleton />
            ) : isError ? (
                <RemindersError
                    onRetry={() => refetch()}
                    retrying={isRefetching}
                />
            ) : reminders.length === 0 ? (
                <EmptyRemindersState />
            ) : (
                <div className="flex flex-1 flex-col space-y-2 overflow-y-auto pr-1">
                    {reminders.map((reminder) => (
                        <ReminderRow key={reminder.id} reminder={reminder} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RemindersDialog() {
    const {
        dialogOpen,
        closeDialog,
        query,
        prioritizedReminders,
        dialogVisibleCount,
        loadMore,
        initialCount,
    } = useRemindersCardContext();

    const visibleReminders = prioritizedReminders.slice(0, dialogVisibleCount);
    const remaining = Math.max(
        prioritizedReminders.length - visibleReminders.length,
        0
    );
    const { isLoading, isError, refetch, isRefetching } = query;

    return (
        <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
                if (!open) {
                    closeDialog();
                }
            }}
        >
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Reminders</span>
                        {renderCountBadge({
                            query,
                            prioritizedReminders,
                            initialCount,
                        })}
                    </DialogTitle>
                    <DialogDescription>
                        Pending and notified reminders in this workspace.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <RemindersSkeleton />
                ) : isError ? (
                    <RemindersError
                        onRetry={() => refetch()}
                        retrying={isRefetching}
                    />
                ) : visibleReminders.length === 0 ? (
                    <EmptyRemindersState />
                ) : (
                    <>
                        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                            {visibleReminders.map((reminder) => (
                                <ReminderRow
                                    key={`dialog-${reminder.id}`}
                                    reminder={reminder}
                                />
                            ))}
                        </div>
                        {remaining > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 w-full"
                                onClick={loadMore}
                            >
                                Show more ({remaining} remaining)
                            </Button>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

type CountContext = {
    query: ReturnType<typeof usePendingRemindersQuery>;
    prioritizedReminders: NormalizedReminder[];
    initialCount?: number;
};

function resolveReminderCount({
    query,
    prioritizedReminders,
    initialCount,
}: CountContext): number | null {
    if (query.isLoading && !query.data) {
        return typeof initialCount === 'number' ? initialCount : null;
    }
    if (query.isError) {
        return typeof initialCount === 'number' ? initialCount : null;
    }
    return prioritizedReminders.length;
}

function renderCountBadge(props: CountContext) {
    const resolved = resolveReminderCount(props);
    const { query } = props;

    if (resolved === null) {
        const label = query.isError ? 'Error' : 'Loading…';
        return (
            <span className="inline-flex items-center rounded-full bg-muted px-2 text-[0.65rem] font-medium text-muted-foreground">
                {label}
            </span>
        );
    }

    return (
        <Badge className="inline-flex rounded-full bg-emerald-200/50 text-emerald-800 px-2 text-[0.8rem] font-medium">
            {resolved} total
        </Badge>
    );
}

function ReminderRow({ reminder }: { reminder: NormalizedReminder }) {
    const isNotified = reminder.status === 'notified';
    const Icon = isNotified ? BellRing : CalendarClock;
    const relativeLabel = formatRelativeTime(reminder.dueDate);
    const absoluteLabel = formatAbsoluteTime(
        reminder.dueDate,
        reminder.whenText
    );

    return (
        <div
            className={cn(
                'flex items-start gap-2 rounded-lg border p-2 transition-all hover:shadow-sm',
                isNotified
                    ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-emerald-500/50 bg-emerald-100/20 dark:bg-emerald-950/20'
            )}
        >
            <div className="flex min-w-0 flex-1 items-start gap-2">
                <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate text-xs font-medium text-foreground">
                        {reminder.documentTitle || 'Untitled document'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
                        <Badge
                            variant={isNotified ? 'default' : 'secondary'}
                            className={cn(
                                'h-4 px-1.5 text-[0.65rem]',
                                isNotified &&
                                    'bg-amber-500 text-white hover:bg-amber-600'
                            )}
                        >
                            {relativeLabel}
                        </Badge>
                        <span className="truncate">{absoluteLabel}</span>
                    </div>
                </div>
            </div>
            <Button
                asChild
                size="icon-sm"
                variant="ghost"
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
                <Link
                    href={`/doc/${reminder.documentId}`}
                    aria-label={`Open ${reminder.documentTitle ?? 'document'}`}
                >
                    <ArrowUpRight className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    );
}

function RemindersSkeleton() {
    return (
        <div className="flex flex-1 flex-col space-y-2">
            {[0, 1, 2].map((idx) => (
                <div
                    key={`reminder-skeleton-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-2"
                >
                    <Skeleton className="h-5 w-5 rounded-full bg-emerald-200/60" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4 rounded bg-emerald-200/60" />
                        <Skeleton className="h-3 w-1/2 rounded bg-emerald-100/60" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function RemindersError({
    onRetry,
    retrying,
}: {
    onRetry: () => void;
    retrying: boolean;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="font-medium text-destructive">
                Couldn&apos;t load reminders
            </p>
            <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={retrying}
            >
                {retrying ? 'Retrying…' : 'Retry'}
            </Button>
        </div>
    );
}

function EmptyRemindersState() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <p>No reminders scheduled yet</p>
            <p className="text-[0.6rem]">
                Add a %%remind%% block in any document to see it here.
            </p>
        </div>
    );
}

function prioritizeReminders(
    reminders: ReminderItemType[]
): NormalizedReminder[] {
    if (!reminders.length) {
        return [];
    }

    const normalized = reminders.map(normalizeReminder);
    const prioritized: NormalizedReminder[] = [];

    for (const status of statusPriority) {
        const matches = normalized
            .filter((reminder) => reminder.status === status)
            .sort((a, b) => getSortValue(a) - getSortValue(b));
        prioritized.push(...matches);
    }

    const prioritizedIds = new Set(prioritized.map((reminder) => reminder.id));
    const leftovers = normalized
        .filter((reminder) => !prioritizedIds.has(reminder.id))
        .sort((a, b) => getSortValue(a) - getSortValue(b));

    return [...prioritized, ...leftovers];
}

function normalizeReminder(reminder: ReminderItemType): NormalizedReminder {
    const body = (reminder.body ?? {}) as Partial<RemindCommandPayloadType>;
    const status =
        (body.status as ReminderStatusType | undefined) ?? 'scheduled';
    const whenISO = body.whenISO ?? null;

    return {
        id: reminder.id,
        documentId: reminder.documentId,
        documentTitle: reminder.documentTitle ?? 'Untitled document',
        status,
        whenISO,
        whenText: body.whenText ?? undefined,
        dueDate: parseDate(whenISO),
        createdAt: parseDate(reminder.createdAt),
    };
}

function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getSortValue(reminder: NormalizedReminder): number {
    if (reminder.dueDate) {
        return reminder.dueDate.getTime();
    }
    if (reminder.createdAt) {
        return reminder.createdAt.getTime();
    }
    return Number.POSITIVE_INFINITY;
}

function formatRelativeTime(date: Date | null): string {
    if (!date) {
        return 'No time set';
    }

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    if (Math.abs(diffSeconds) < 60) {
        return relativeTimeFormatter.format(diffSeconds, 'second');
    }

    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
        return relativeTimeFormatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return relativeTimeFormatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) {
        return relativeTimeFormatter.format(diffDays, 'day');
    }

    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 5) {
        return relativeTimeFormatter.format(diffWeeks, 'week');
    }

    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
        return relativeTimeFormatter.format(diffMonths, 'month');
    }

    const diffYears = Math.round(diffDays / 365);
    return relativeTimeFormatter.format(diffYears, 'year');
}

function formatAbsoluteTime(date: Date | null, fallback?: string): string {
    if (!date) {
        return fallback ?? 'Time not set';
    }

    const now = new Date();
    const startOfToday = startOfDay(now);
    const startOfTarget = startOfDay(date);
    const diffDays = Math.round(
        (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000
    );
    const timeLabel = timeFormatter.format(date);

    if (diffDays === 0) {
        return `Today at ${timeLabel}`;
    }
    if (diffDays === 1) {
        return `Tomorrow at ${timeLabel}`;
    }
    if (diffDays === -1) {
        return `Yesterday at ${timeLabel}`;
    }
    if (Math.abs(diffDays) < 7) {
        return `${weekdayFormatter.format(date)} at ${timeLabel}`;
    }
    return preciseDateFormatter.format(date);
}

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
    CalendarClock,
    CheckCircle,
    Clock,
    Cpu,
    Pencil,
    RotateCcw,
    Search,
    Star,
    Tag as TagIcon,
    Target,
    XCircle,
    Zap,
} from 'lucide-react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import {
    DashboardGrid,
    DashboardGridItem,
} from '@/components/dashboard/dashboard-grid';
import { SearchQualityLineChart } from '@/components/dashboard/search-quality-line-chart';
import { TagNetworkGraph } from '@/components/dashboard/tag-network-graph';
import type { GraphDocumentInput } from '@/components/dashboard/tag-network-graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const previewSearchMetrics = [
    { label: 'Total searches', value: '1,248', trend: '+12%', trendUp: true },
    { label: 'P95 latency', value: '680ms', trend: '-6%', trendUp: false },
    { label: 'Success rate', value: '94.2%', trend: '+2.1%', trendUp: true },
];

const previewTopQueries = [
    { query: 'authentication flow', count: 47 },
    { query: 'api documentation', count: 38 },
    { query: 'deployment guide', count: 29 },
    { query: 'incident response', count: 22 },
    { query: 'security review', count: 18 },
];

const previewQualitySeries = [
    {
        timestamp: '2024-11-01T00:00:00.000Z',
        successRate: 92.4,
        zeroResultRate: 6.2,
    },
    {
        timestamp: '2024-11-02T00:00:00.000Z',
        successRate: 93.1,
        zeroResultRate: 5.9,
    },
    {
        timestamp: '2024-11-03T00:00:00.000Z',
        successRate: 92.8,
        zeroResultRate: 6.1,
    },
    {
        timestamp: '2024-11-04T00:00:00.000Z',
        successRate: 93.6,
        zeroResultRate: 5.6,
    },
    {
        timestamp: '2024-11-05T00:00:00.000Z',
        successRate: 94.1,
        zeroResultRate: 5.2,
    },
    {
        timestamp: '2024-11-06T00:00:00.000Z',
        successRate: 94.4,
        zeroResultRate: 5.0,
    },
    {
        timestamp: '2024-11-07T00:00:00.000Z',
        successRate: 94.0,
        zeroResultRate: 5.3,
    },
];

const previewIndexingStats = {
    failed: 1,
    processing: 3,
    queued: 9,
    indexed: 238,
    activeWorkers: { current: 2, max: 5 },
    queueWaitTime: '~3m',
    indexedToday: 24,
};

const previewIndexingJobs = [
    {
        id: '1',
        documentName: 'API Documentation v2.md',
        status: 'processing',
        statusLabel: 'Processing',
        icon: '⚙️',
        details: '45s · 127/189 chunks',
        progress: {
            current: 127,
            total: 189,
            percentage: 67,
        },
    },
    {
        id: '2',
        documentName: 'Team Handbook.md',
        status: 'failed',
        statusLabel: 'Failed',
        icon: '⚠️',
        details: 'Retry available · 5m ago',
        hasAction: true,
        actionLabel: 'Retry',
    },
    {
        id: '3',
        documentName: 'Design System Guidelines.md',
        status: 'queued',
        statusLabel: 'Queued',
        icon: '⏳',
        details: 'Estimated wait: ~4m · 8 KB',
        queuePosition: 3,
    },
    {
        id: '4',
        documentName: 'Platform GTM plan.pptx',
        status: 'indexed',
        statusLabel: 'Indexed',
        icon: '✓',
        details: 'Completed in 2.3s · 156 chunks · 2m ago',
    },
];

const previewJobStatusConfig = {
    failed: {
        label: 'Failed',
        variant: 'destructive' as const,
        icon: XCircle,
        iconClassName: 'text-destructive',
    },
    processing: {
        label: 'Processing',
        variant: 'secondary' as const,
        icon: Cpu,
        iconClassName: 'text-muted-foreground',
    },
    queued: {
        label: 'Queued',
        variant: 'outline' as const,
        icon: Clock,
        iconClassName: 'text-muted-foreground',
    },
    indexed: {
        label: 'Indexed',
        variant: 'secondary' as const,
        icon: CheckCircle,
        iconClassName: 'text-emerald-600',
    },
} as const;

const previewGraphTags = [
    { id: 'product', name: 'Product', color: '#2563eb' },
    { id: 'api', name: 'API', color: '#14b8a6' },
    { id: 'security', name: 'Security', color: '#f97316' },
    { id: 'onboarding', name: 'Onboarding', color: '#a855f7' },
];

const previewTagMap = Object.fromEntries(
    previewGraphTags.map((tag) => [tag.id, tag])
);

const pickPreviewTags = (...ids: string[]) =>
    ids
        .map((id) => previewTagMap[id])
        .filter((tag): tag is (typeof previewGraphTags)[number] => Boolean(tag))
        .map((tag) => ({ ...tag }));

const previewGraphDocuments: GraphDocumentInput[] = [
    {
        id: 'handbook',
        title: 'Team Handbook',
        tags: pickPreviewTags('product', 'onboarding'),
    },
    {
        id: 'auth-plan',
        title: 'Auth Rollout Plan',
        tags: pickPreviewTags('api', 'security'),
    },
    {
        id: 'changelog',
        title: 'Changelog',
        tags: pickPreviewTags('product', 'api'),
    },
];

type PreviewReminder = {
    id: string;
    title: string;
    document: string;
    due: string;
    status: 'due' | 'scheduled' | 'info';
};

const previewReminders: PreviewReminder[] = [
    {
        id: '1',
        title: 'Share launch recap',
        document: 'Product kickoff notes',
        due: 'Today · 4:30 PM',
        status: 'due',
    },
    {
        id: '2',
        title: 'Reindex support inbox',
        document: 'Zendesk integration',
        due: 'Tomorrow · 9:00 AM',
        status: 'scheduled',
    },
    {
        id: '3',
        title: 'Follow up with finance',
        document: 'Spend dashboard',
        due: 'Friday · 1:00 PM',
        status: 'info',
    },
];

const workspaceStats = [
    {
        label: 'Documents',
        value: '2,439',
        helper: '+86 this week',
    },
    {
        label: 'Members',
        value: '184',
        helper: '12 active today',
    },
    {
        label: 'Tags',
        value: '63',
        helper: 'Top: #api',
    },
];

type ActivityItem = {
    user: string;
    action: string;
    target: string;
    detail?: string;
    time: string;
    Icon: LucideIcon;
};

const previewActivity: ActivityItem[] = [
    {
        user: 'Mike Johnson',
        action: 'tagged',
        target: 'API Documentation',
        detail: 'with "engineering"',
        time: '15m ago',
        Icon: TagIcon,
    },
    {
        user: 'Alex Rivera',
        action: 'favorited',
        target: 'Team Handbook',
        time: '1h ago',
        Icon: Star,
    },
    {
        user: 'Sarah Chen',
        action: 'updated',
        target: 'Design System Guidelines',
        time: '2h ago',
        Icon: Pencil,
    },
    {
        user: 'Priya Patel',
        action: 'tagged',
        target: 'Security playbook',
        detail: 'with "compliance"',
        time: '3h ago',
        Icon: TagIcon,
    },
];

export default async function LandingPage() {
    const session = await getServerSession(authOptions);
    if (session) {
        redirect('/dashboard');
    }
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <section className="relative flex min-h-[35vh] items-center justify-center overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background">
                <div className="absolute inset-0 bg-grid-white/[0.02]" />
                <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center">
                    <Badge variant="secondary" className="px-3 py-1 text-xs">
                        Introducing the new Search Hub dashboard
                    </Badge>
                    <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                        Every signal from your knowledge graph in one view.
                    </h1>
                    <p className="max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                        Aggregate search intelligence, pipeline health, tag
                        relationships, and reminders from the moment you land.
                        The redesigned workspace keeps teams proactive and
                        aligned.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button size="lg" asChild>
                            <Link href="/auth/sign-up">
                                Create your workspace
                            </Link>
                        </Button>
                        <Button variant="ghost" size="lg" asChild>
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <main className="flex-1 bg-muted/10">
                <section className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <Badge variant="outline" className="px-3 py-1 text-xs">
                            Live dashboard preview
                        </Badge>
                        <h2 className="text-3xl font-semibold tracking-tight">
                            See what's waiting inside.
                        </h2>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            The public landing page now mirrors the in-product
                            experience so your team can explore search
                            performance, data ingestion, and collaboration
                            signals before creating an account.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-border/40 bg-background/95 p-4 shadow-2xl shadow-primary/5 sm:p-6">
                        <DashboardPreview />
                    </div>
                </section>
            </main>
        </div>
    );
}

function DashboardPreview() {
    return (
        <DashboardGrid className="lg:min-h-[34rem]">
            <DashboardGridItem colSpan={2} rowSpan={1}>
                <DashboardCard
                    variant="medium"
                    title="Quick Search"
                    description="Unified across docs, chats, and tickets."
                    className="h-full"
                >
                    <div className="flex h-full flex-col gap-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                                placeholder='Try "auth rollout plan"'
                                className="flex-1"
                            />
                            <Button size="sm" className="sm:w-auto">
                                Search
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Suggested: &quot;incident response&quot;, &quot;OKR
                            draft&quot;, &quot;pricing updates&quot;
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-border/40 bg-muted/30 p-2">
                                Filters applied ·{' '}
                                <span className="font-semibold">
                                    Engineering
                                </span>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-muted/30 p-2">
                                Saved view ·{' '}
                                <span className="font-semibold">
                                    Launch prep
                                </span>
                            </div>
                        </div>
                    </div>
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={4} rowSpan={3}>
                <DashboardCard
                    variant="large"
                    title="Search Intelligence"
                    action={
                        <Button variant="ghost" size="sm">
                            Analytics
                        </Button>
                    }
                    className="h-full"
                >
                    <SearchIntelligencePreview />
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={2} rowSpan={1}>
                <DashboardCard
                    variant="medium"
                    title="Workspace Overview"
                    description="Snapshot across your tenant."
                    className="h-full"
                >
                    <WorkspaceOverviewPreview />
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={2} rowSpan={2}>
                <DashboardCard
                    variant="medium"
                    title="Reminders"
                    description="Stay on top of follow-ups."
                    action={
                        <Button variant="ghost" size="sm">
                            Add reminder
                        </Button>
                    }
                    className="h-full"
                >
                    <RemindersPreview />
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={2} rowSpan={3}>
                <DashboardCard
                    variant="medium"
                    title="Knowledge Network"
                    description="Documents and tags visualized."
                    action={
                        <Button variant="ghost" size="sm">
                            Explore
                        </Button>
                    }
                    className="h-full"
                >
                    <TagNetworkGraph
                        documents={previewGraphDocuments}
                        tags={previewGraphTags}
                        fallback={
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Graph preview unavailable
                            </div>
                        }
                    />
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={2} rowSpan={3}>
                <DashboardCard
                    variant="large"
                    title="Indexing Pipeline Status"
                    action={
                        <Button variant="ghost" size="sm">
                            View queue
                        </Button>
                    }
                    className="h-full"
                >
                    <IndexingPipelineStatusPreview />
                </DashboardCard>
            </DashboardGridItem>

            <DashboardGridItem colSpan={2} rowSpan={2}>
                <DashboardCard
                    variant="medium"
                    title="Recent Activity"
                    action={
                        <Button variant="ghost" size="sm">
                            View all
                        </Button>
                    }
                    className="h-full"
                >
                    <RecentActivityPreview />
                </DashboardCard>
            </DashboardGridItem>
        </DashboardGrid>
    );
}

function SearchIntelligencePreview() {
    const getTrendColor = (
        metric: (typeof previewSearchMetrics)[number]
    ) => {
        if (metric.trendUp === undefined) {
            return 'text-muted-foreground';
        }
        return metric.trendUp
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400';
    };

    const getMetricIcon = (label: string) => {
        const iconProps = {
            className: 'h-4 w-4 shrink-0 text-muted-foreground',
        };
        if (label.toLowerCase().includes('search')) {
            return <Search {...iconProps} />;
        }
        if (
            label.toLowerCase().includes('latency') ||
            label.toLowerCase().includes('speed')
        ) {
            return <Zap {...iconProps} />;
        }
        if (
            label.toLowerCase().includes('success') ||
            label.toLowerCase().includes('rate')
        ) {
            return <Target {...iconProps} />;
        }
        return <Search {...iconProps} />;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
            <div className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="flex gap-2 shrink-0">
                    {previewSearchMetrics.map((metric) => (
                        <div
                            key={metric.label}
                            className="rounded-lg border border-border/40 bg-card shadow-sm p-2.5 flex-1 flex flex-col justify-center"
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                {getMetricIcon(metric.label)}
                                <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground font-medium">
                                    {metric.label}
                                </p>
                            </div>
                            <p className="text-xl font-bold">{metric.value}</p>
                            <p
                                className={`text-[0.65rem] font-medium ${getTrendColor(
                                    metric
                                )}`}
                                title="Compared to previous 7-day period"
                            >
                                {metric.trend}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="border-t border-border/40 pt-3 flex-1 flex flex-col min-h-0">
                    <h4 className="text-xs font-semibold tracking-tight mb-2 text-foreground shrink-0">
                        Top Search Queries
                    </h4>
                    <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                        {previewTopQueries.map((item, idx) => (
                            <div
                                key={`${item.query}-${idx}`}
                                className="flex items-center justify-between rounded-lg border border-border/30 bg-card shadow-sm px-2.5 py-1.5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-[0.65rem] font-medium text-muted-foreground">
                                        {idx + 1}
                                    </span>
                                    <p className="text-[0.65rem] font-medium truncate">
                                        "{item.query}"
                                    </p>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="text-[0.65rem] h-4 px-1.5"
                                >
                                    {item.count}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <h5 className="text-sm font-semibold pb-4">
                    Search Quality
                </h5>
                <SearchQualityLineChart data={previewQualitySeries} />
            </div>
        </div>
    );
}

function IndexingPipelineStatusPreview() {
    const jobs = previewIndexingJobs.slice(0, 3);

    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 shrink-0">
                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Failed
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {previewIndexingStats.failed}
                            </p>
                        </div>
                    </div>
                    {previewIndexingStats.failed > 0 ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-1.5 text-[0.6rem] h-5"
                        >
                            <RotateCcw className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                            <span className="truncate">Retry All</span>
                        </Button>
                    ) : null}
                </div>

                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Processing
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {previewIndexingStats.processing}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        Active: {previewIndexingStats.activeWorkers.current}/
                        {previewIndexingStats.activeWorkers.max}
                    </p>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/40 p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Queued
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {previewIndexingStats.queued}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        Wait: {previewIndexingStats.queueWaitTime}
                    </p>
                </div>

                <div className="rounded-lg border border-border/40 bg-card shadow-sm p-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-wide leading-none truncate">
                                Indexed
                            </p>
                            <p className="text-xl font-bold leading-none mt-0.5 truncate">
                                {previewIndexingStats.indexed}
                            </p>
                        </div>
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1.5 truncate">
                        +{previewIndexingStats.indexedToday} today
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="text-[0.65rem] font-semibold tracking-tight mb-1.5 text-muted-foreground uppercase shrink-0">
                    Recent Jobs
                </h4>
                <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                    {jobs.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            No recent jobs
                        </div>
                    ) : (
                        jobs.map((job) => {
                            const statusConfig =
                                previewJobStatusConfig[
                                    job.status as keyof typeof previewJobStatusConfig
                                ] ?? previewJobStatusConfig.processing;
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={job.id}
                                    className="rounded-lg border border-border/30 bg-card shadow-sm p-2"
                                >
                                    <div className="flex items-start gap-2">
                                        <StatusIcon
                                            className={`h-4 w-4 shrink-0 ${statusConfig.iconClassName}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold truncate">
                                                    {job.documentName}
                                                </p>
                                                <Badge
                                                    variant={statusConfig.variant}
                                                    className="text-[0.6rem] h-4 px-1.5"
                                                >
                                                    {job.statusLabel ||
                                                        statusConfig.label}
                                                </Badge>
                                            </div>
                                            <p className="text-[0.65rem] text-muted-foreground">
                                                {job.details}
                                            </p>
                                            {job.progress ? (
                                                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted/40">
                                                    <div
                                                        className="h-1.5 rounded-full bg-emerald-500"
                                                        style={{
                                                            width: `${job.progress.percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            ) : null}
                                            {job.queuePosition ? (
                                                <p className="mt-1 text-[0.6rem] text-muted-foreground">
                                                    Queue position{' '}
                                                    {job.queuePosition}
                                                </p>
                                            ) : null}
                                            {job.hasAction ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1.5 h-6 px-2 text-[0.6rem]"
                                                >
                                                    {job.actionLabel || 'Retry'}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function WorkspaceOverviewPreview() {
    return (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {workspaceStats.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-lg border border-dashed border-emerald-200/60 bg-emerald-50/50 p-3 text-left"
                >
                    <p className="text-[0.65rem] font-medium uppercase tracking-wide text-emerald-700">
                        {stat.label}
                    </p>
                    <p className="text-2xl font-semibold text-emerald-900">
                        {stat.value}
                    </p>
                    <p className="text-[0.65rem] font-medium text-emerald-600">
                        {stat.helper}
                    </p>
                </div>
            ))}
        </div>
    );
}

function RemindersPreview() {
    return (
        <div className="flex h-full flex-col gap-2">
            {previewReminders.map((reminder) => (
                <div
                    key={reminder.id}
                    className="rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold">
                                {reminder.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {reminder.document}
                            </p>
                        </div>
                        <Badge variant={getReminderBadge(reminder.status)}>
                            {getReminderLabel(reminder.status)}
                        </Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {reminder.due}
                    </p>
                </div>
            ))}
            <Button variant="secondary" size="sm" className="mt-1 self-start">
                Review reminders
            </Button>
        </div>
    );
}

function getReminderBadge(status: PreviewReminder['status']) {
    if (status === 'due') return 'destructive';
    if (status === 'scheduled') return 'secondary';
    return 'outline';
}

function getReminderLabel(status: PreviewReminder['status']) {
    if (status === 'due') return 'Due soon';
    if (status === 'scheduled') return 'Scheduled';
    return 'Reminder';
}

function RecentActivityPreview() {
    return (
        <div className="flex h-full flex-col gap-1.5">
            {previewActivity.map((activity, idx) => (
                <div
                    key={`${activity.user}-${idx}`}
                    className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 p-2"
                >
                    <activity.Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-xs leading-relaxed">
                        <span className="font-semibold text-foreground">
                            {activity.user}
                        </span>{' '}
                        <span className="text-muted-foreground">
                            {activity.action}
                        </span>{' '}
                        <span className="font-semibold text-foreground">
                            {activity.target}
                        </span>{' '}
                        {activity.detail ? (
                            <span className="text-muted-foreground">
                                {activity.detail}{' '}
                            </span>
                        ) : null}
                        <span className="text-muted-foreground">·</span>{' '}
                        <span className="text-muted-foreground">
                            {activity.time}
                        </span>
                    </div>
                </div>
            ))}
            <div className="mt-auto rounded-lg border border-dashed border-border/50 bg-muted/20 p-2 text-center text-xs text-muted-foreground">
                Activity feed updates in real-time inside the product.
            </div>
        </div>
    );
}

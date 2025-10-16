import Link from 'next/link';

import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <section className="relative flex min-h-[35vh] items-center justify-center overflow-hidden border-b">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
                <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center">
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                        Unified search for every team
                    </Badge>
                    <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                        Discover and act on knowledge, faster than ever.
                    </h1>
                    <p className="max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
                        Index documents, conversations, and structured data into
                        a single workspace. Powerful hybrid search helps your
                        team surface the right answer in seconds.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button size="lg" asChild>
                            <Link href="/auth/sign-up">Create your workspace</Link>
                        </Button>
                        <Button variant="ghost" size="lg" asChild>
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <main className="space-y-10 px-6 pb-16 pt-10">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-center sm:text-left">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Everything your workspace needs
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Explore how Search Hub keeps teams aligned and information accessible.
                    </p>
                </div>

                <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-3 xl:grid-cols-12">
                    <DashboardCard
                        variant="wide"
                        title="Effortless knowledge search"
                        description="Quickly find documents, answers, and conversations across your entire workspace."
                        action={
                            <Button variant="ghost" size="sm">
                                Watch demo
                            </Button>
                        }
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <Input
                                    placeholder="Try: quarterly roadmap updates"
                                    className="w-full md:flex-1"
                                />
                                <div className="flex flex-col gap-2 md:flex-row">
                                    <Button className="w-full md:w-auto">
                                        Run search
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full md:w-auto"
                                    >
                                        Explore datasets
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    {
                                        title: 'Smart filters',
                                        body: 'Slice results by tenant, author, or tags instantly.',
                                    },
                                    {
                                        title: 'Answer insights',
                                        body: 'Get AI summaries with source citations.',
                                    },
                                    {
                                        title: 'Saved views',
                                        body: 'Bookmark frequent searches for one-click access.',
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-xl border border-border/60 bg-background/40 p-4"
                                    >
                                        <p className="text-sm font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DashboardCard>

                    <DashboardCard
                        variant="large"
                        title="Usage analytics"
                        description="Understand how your team engages with knowledge."
                    >
                        <div className="grid gap-4 md:grid-cols-3">
                            {[
                                {
                                    label: 'Active searches',
                                    value: '1,248',
                                    trend: '+12%',
                                },
                                {
                                    label: 'Response latency',
                                    value: '480 ms',
                                    trend: '−6%',
                                },
                                {
                                    label: 'Adoption rate',
                                    value: '87%',
                                    trend: '+4%',
                                },
                            ].map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-2xl border border-border/70 bg-background/60 p-4"
                                >
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        {metric.label}
                                    </p>
                                    <p className="mt-3 text-2xl font-semibold">
                                        {metric.value}
                                    </p>
                                    <p className="text-xs text-emerald-600">
                                        {metric.trend} vs last week
                                    </p>
                                    <div className="mt-4 h-14 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
                                </div>
                            ))}
                        </div>
                    </DashboardCard>

                    <DashboardCard
                        variant="medium"
                        title="Recent documents"
                        description="Latest material synced into your workspace."
                    >
                        <ul className="space-y-4">
                            {[1, 2, 3, 4].map((idx) => (
                                <li
                                    key={idx}
                                    className="flex items-start justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            Product launch briefing #{idx}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Updated {idx}h ago · PDF · 2 contributors
                                        </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        Preview
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </DashboardCard>

                    <DashboardCard
                        variant="small"
                        title="Pipeline health"
                        description="Real-time signal on ingestion and indexing."
                    >
                        <div className="space-y-4">
                            {[
                                {
                                    label: 'Indexing status',
                                    value: 'Running',
                                    tone: 'success' as const,
                                },
                                {
                                    label: 'Commands queued',
                                    value: '8',
                                    tone: 'warning' as const,
                                },
                                {
                                    label: 'Errors today',
                                    value: '0',
                                    tone: 'success' as const,
                                },
                            ].map((status) => {
                                const badgeVariant =
                                    status.tone === 'success'
                                        ? 'secondary'
                                        : status.tone === 'warning'
                                        ? 'outline'
                                        : 'destructive';
                                const badgeText =
                                    status.tone === 'success'
                                        ? 'Healthy'
                                        : status.tone === 'warning'
                                        ? 'Needs review'
                                        : 'Check now';

                                return (
                                    <div
                                        key={status.label}
                                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3"
                                    >
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                {status.label}
                                            </p>
                                            <p className="text-sm font-medium">
                                                {status.value}
                                            </p>
                                        </div>
                                        <Badge variant={badgeVariant}>
                                            {badgeText}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </DashboardCard>

                    <DashboardCard
                        variant="stacked"
                        title="Pinned references"
                        description="Highlight the documents teams revisit most."
                    >
                        <div className="space-y-3">
                            {[1, 2, 3].map((idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-border/60 bg-background/60 p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Enablement checklist — Q{idx}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Last opened {idx} days ago · Shared with 4 people
                                            </p>
                                        </div>
                                        <Badge variant="outline">Pinned</Badge>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-md border border-dashed border-border px-2 py-0.5">
                                            #sales
                                        </span>
                                        <span className="rounded-md border border-dashed border-border px-2 py-0.5">
                                            #enablement
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>

                    <DashboardCard
                        variant="optional"
                        title="Usage summary"
                        description="Monitor consumption and plan limits at a glance."
                        className="border-dashed"
                    >
                        <div className="space-y-5">
                            {[
                                {
                                    label: 'Document storage',
                                    value: '65% of 50 GB',
                                    percent: 0.74,
                                },
                                {
                                    label: 'API calls',
                                    value: '12,480 of 20,000',
                                    percent: 0.62,
                                },
                                {
                                    label: 'Vector credits',
                                    value: '40% remaining',
                                    percent: 0.4,
                                },
                            ].map((item) => (
                                <div key={item.label} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{item.label}</span>
                                        <span>{item.value}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className="h-full rounded-full bg-primary transition-[width]"
                                            style={{
                                                width: `${Math.round(item.percent * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </div>
            </main>
        </div>
    );
}

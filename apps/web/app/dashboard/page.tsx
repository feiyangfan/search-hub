import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EmptyStateCreateWorkspace } from '@/components/workspace/empty-state-create-workspace';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/sign-in');
    }

    const memberships =
        (session.user as { memberships?: unknown[] })?.memberships ?? [];

    if (memberships.length === 0) {
        return <EmptyStateCreateWorkspace />;
    }

    return (
        <div className="space-y-10 px-6 pb-12">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight pt-4">
                    Workspace dashboard
                </h1>
                <p className="text-muted-foreground text-sm">
                    A quick snapshot of activity, health, and actions for your
                    team.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
                <DashboardCard
                    variant="wide"
                    title="Quick workspace actions"
                    description="Jump into a search, ingest new documents, or invite collaborators."
                    action={
                        <Button variant="ghost" size="sm">
                            View all actions
                        </Button>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <Input
                                placeholder="Search across documents, answers, and conversations…"
                                className="w-full md:flex-1"
                            />
                            <div className="flex flex-col gap-2 md:flex-row">
                                <Button className="w-full md:w-auto">
                                    New search
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full md:w-auto"
                                >
                                    Ingest documents
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                {
                                    title: 'Invite teammates',
                                    body: 'Share access and set roles.',
                                },
                                {
                                    title: 'Review access',
                                    body: 'Check who can see what.',
                                },
                                {
                                    title: 'Browse templates',
                                    body: 'Kickstart new workflows.',
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
                    title="Analytics overview"
                    description="Performance snapshot for the last 7 days."
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                label: 'Total searches',
                                value: '1,248',
                                trend: '+12%',
                            },
                            {
                                label: 'Avg. latency',
                                value: '480 ms',
                                trend: '−6%',
                            },
                            {
                                label: 'Active users',
                                value: '32',
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
                    description="Latest material added to the workspace."
                >
                    <ul className="space-y-4">
                        {[1, 2, 3, 4].map((idx) => (
                            <li
                                key={idx}
                                className="flex items-start justify-between gap-4"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        Competitive Landscape Notes #{idx}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Updated {idx}h ago · PDF · 2
                                        contributors
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Open
                                </Button>
                            </li>
                        ))}
                    </ul>
                </DashboardCard>

                <DashboardCard
                    variant="small"
                    title="Pipeline health"
                    description="Monitor ingestion and indexing at a glance."
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
                    title="Pinned & recently viewed"
                    description="Keep important work within one click."
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
                                            Launch brief — Q{idx}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Last opened {idx} days ago · Shared
                                            with 4 people
                                        </p>
                                    </div>
                                    <Badge variant="outline">Pinned</Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span className="rounded-md border border-dashed border-border px-2 py-0.5">
                                        #product
                                    </span>
                                    <span className="rounded-md border border-dashed border-border px-2 py-0.5">
                                        #launch
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </DashboardCard>

                <DashboardCard
                    variant="optional"
                    title="Usage summary"
                    description="Track consumption to stay within plan limits."
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
                                            width: `${Math.round(
                                                item.percent * 100
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}

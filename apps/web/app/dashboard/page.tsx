import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EmptyStateCreateWorkspace } from '@/components/workspace/empty-state-create-workspace';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { SearchHubClient } from '@search-hub/sdk';
import { Tag, TagOption } from '@/components/ui/tag';
import { MasonryGrid } from '@/components/dashboard/masonry-grid';
import { SearchVolumeChart } from '@/components/dashboard/search-volume-chart';
const apiBase = process.env.API_URL ?? 'http://localhost:3000';

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

    let tags: TagOption[] = [];
    try {
        const apiSessionCookie = (session as { apiSessionCookie?: string })
            .apiSessionCookie;

        if (apiSessionCookie) {
            const client = new SearchHubClient({
                baseUrl: apiBase,
                headers: { cookie: apiSessionCookie },
            });

            const response = await client.getTags();

            tags =
                response.tags.map((tag: any) => ({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                    description: tag.description,
                })) || [];
        }
    } catch (error) {
        console.error('Failed to fetch tags:', error);
    }

    return (
        <div className="h-[calc(100vh-4rem)] overflow-y-auto px-6 py-6 bg-accent-foreground/3">
            <MasonryGrid>
                <DashboardCard
                    variant="medium"
                    title="Quick Search"
                    className="mb-6 break-inside-avoid"
                >
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search across documents..."
                            className="flex-1"
                        />
                        <Button>Search</Button>
                    </div>
                </DashboardCard>

                <DashboardCard
                    variant="medium"
                    title="Workspace Overview"
                    description="Content and collaboration"
                    className="mb-6 break-inside-avoid"
                >
                    <div className="space-y-4">
                        {/* Stats Grid - Content + Collaboration */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Documents
                                </p>
                                <p className="text-2xl font-bold">47</p>
                                <p className="text-xs text-muted-foreground">
                                    +3 this week
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Collaborators
                                </p>
                                <p className="text-2xl font-bold">5</p>
                                <p className="text-xs text-muted-foreground">
                                    members
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Tags
                                </p>
                                <p className="text-2xl font-bold">
                                    {tags.length}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    categories
                                </p>
                            </div>
                        </div>

                        {/* Tags Section */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold tracking-tight">
                                Workspace Tags
                            </h4>
                            {tags.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No tags yet
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag: any) => (
                                        <Tag key={tag.id} tag={tag} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard
                    variant="large"
                    title="Search Intelligence"
                    description="Performance metrics"
                    action={
                        <Button variant="ghost" size="sm">
                            Analytics
                        </Button>
                    }
                    className="mb-6 break-inside-avoid"
                >
                    <div className="space-y-4">
                        {/* Primary Metrics Grid - 3 columns */}
                        <div className="grid gap-2 md:grid-cols-3">
                            {[
                                {
                                    label: 'Total searches',
                                    value: '1,248',
                                    trend: '+12%',
                                    trendUp: true,
                                },
                                {
                                    label: 'P95 latency',
                                    value: '680ms',
                                    trend: '−6%',
                                    trendUp: false,
                                },
                                {
                                    label: 'Success rate',
                                    value: '94.2%',
                                    trend: '+2.1%',
                                    trendUp: true,
                                },
                            ].map((metric) => (
                                <div
                                    key={metric.label}
                                    className="rounded-xl border border-border/60 bg-background/40 p-3"
                                >
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        {metric.label}
                                    </p>
                                    <p className="mt-1 text-xl font-bold">
                                        {metric.value}
                                    </p>
                                    <p
                                        className={`text-xs mt-0.5 ${
                                            (metric.trendUp &&
                                                metric.trend.startsWith('+')) ||
                                            (!metric.trendUp &&
                                                metric.trend.startsWith('−'))
                                                ? 'text-emerald-600'
                                                : 'text-amber-600'
                                        }`}
                                    >
                                        {metric.trend}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Top Search Queries */}
                        <div>
                            <h4 className="text-xs font-semibold tracking-tight mb-2">
                                Top Search Queries
                            </h4>
                            <div className="space-y-1.5">
                                {[
                                    { query: 'authentication flow', count: 47 },
                                    { query: 'api documentation', count: 38 },
                                    { query: 'deployment guide', count: 29 },
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {idx + 1}
                                            </span>
                                            <p className="text-xs font-medium truncate">
                                                "{item.query}"
                                            </p>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs h-5"
                                        >
                                            {item.count}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard
                    variant="medium"
                    title="Search Volume Trend"
                    description="7-day search activity"
                    className="mb-6 break-inside-avoid"
                >
                    <SearchVolumeChart />
                </DashboardCard>

                <DashboardCard
                    variant="medium"
                    title="Recent activity"
                    description="Latest workspace actions"
                    action={
                        <Button variant="ghost" size="sm">
                            View all
                        </Button>
                    }
                    className="mb-6 break-inside-avoid"
                >
                    <div className="space-y-2">
                        {[
                            {
                                type: 'TAG_ADDED_TO_DOCUMENT',
                                user: 'Mike Johnson',
                                action: 'tagged',
                                target: 'API Documentation',
                                detail: 'with "engineering"',
                                time: '15m ago',
                                icon: '🏷️',
                            },
                            {
                                type: 'DOCUMENT_FAVORITED',
                                user: 'Alex Rivera',
                                action: 'favorited',
                                target: 'Team Handbook',
                                time: '1h ago',
                                icon: '⭐',
                            },
                            {
                                type: 'DOCUMENT_UPDATED',
                                user: 'Sarah Chen',
                                action: 'updated',
                                target: 'Design System Guidelines',
                                time: '2h ago',
                                icon: '✏️',
                            },
                        ].map((activity, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-2 transition-colors hover:bg-muted/50"
                            >
                                <div className="text-lg leading-none mt-0.5">
                                    {activity.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs">
                                        <span className="font-medium text-foreground">
                                            {activity.user}
                                        </span>{' '}
                                        <span className="text-muted-foreground">
                                            {activity.action}
                                        </span>{' '}
                                        <span className="font-medium text-foreground truncate">
                                            {activity.target}
                                        </span>
                                        {activity.detail && (
                                            <>
                                                {' '}
                                                <span className="text-muted-foreground">
                                                    {activity.detail}
                                                </span>
                                            </>
                                        )}
                                        {' · '}
                                        <span className="text-muted-foreground">
                                            {activity.time}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DashboardCard>

                {/* <DashboardCard
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
                </DashboardCard> */}
            </MasonryGrid>
        </div>
    );
}

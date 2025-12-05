import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EmptyStateCreateWorkspace } from '@/components/workspace/empty-state-create-workspace';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { SearchHubClient } from '@search-hub/sdk';
import { TagOption, DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import { ClickableTag } from '@/components/dashboard/clickable-tag';
import {
    DashboardGrid,
    DashboardGridItem,
} from '@/components/dashboard/dashboard-grid';
import { TagNetworkGraph } from '@/components/dashboard/tag-network-graph';
import type { GraphDocumentInput } from '@/components/dashboard/tag-network-graph';
import { IndexingPipelineStatus } from '@/components/dashboard/indexing-pipeline-status';
import { SearchIntelligence } from '@/components/dashboard/search-intelligence';
import { Tag as TagIcon, Star, Pencil } from 'lucide-react';
import type { TagListItemType } from '@search-hub/schemas';
import { WorkspaceOverviewCard } from '@/components/dashboard/dashboard-card/workspace-overview-card';
import {
    RemindersCardProvider,
    RemindersCardContent,
    RemindersCardAction,
} from '@/components/dashboard/dashboard-card/reminders-card';
import { QuickSearchCard } from '@/components/dashboard/quick-search-card';

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

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;

    let tags: TagOption[] = [];
    let graphDocuments: GraphDocumentInput[] = [];
    let remindersCount: number | undefined = undefined;

    if (apiSessionCookie) {
        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        try {
            const response = await client.getTags({ includeCount: true });
            const apiTags = (response.tags ?? []) as TagListItemType[];
            tags = apiTags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color ?? DEFAULT_TAG_COLOR,
                description: undefined,
                count: tag.documentCount ?? 0,
            }));
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }

        try {
            const maxDocuments = 12;
            const documentsResponse = await client.listDocuments({
                limit: maxDocuments,
            });

            const documents = documentsResponse.documents?.items ?? [];

            const documentsWithTags = await Promise.all(
                documents.map(async (document) => {
                    try {
                        const { tags: assignedTags = [] } =
                            await client.getDocumentTags(document.id);
                        return { document, tags: assignedTags ?? [] };
                    } catch (error) {
                        console.error(
                            'Failed to fetch tags for document',
                            document.id,
                            error
                        );
                        return {
                            document,
                            tags: [] as {
                                id: string;
                                name: string;
                                color?: string | null;
                            }[],
                        };
                    }
                })
            );

            graphDocuments = documentsWithTags
                .filter(({ tags: docTags }) => docTags.length > 0)
                .map(({ document, tags: docTags }) => ({
                    id: document.id,
                    title: document.title ?? 'Untitled document',
                    tags: docTags.map((tag) => ({
                        id: tag.id,
                        name: tag.name,
                        color: tag.color ?? undefined,
                    })),
                }));
        } catch (error) {
            console.error('Failed to build tag network graph:', error);
        }

        try {
            const pendingReminders = await client.getPendingReminders();
            remindersCount = pendingReminders.reminders?.length ?? 0;
        } catch (error) {
            console.error('Failed to fetch reminders count:', error);
        }
    }

    return (
        <div className="w-full bg-muted/5 px-4 py-6 lg:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <DashboardGrid className="lg:auto-rows-min">
                    {/* Row 1: Quick Search (2 cols) + Search Intelligence (4 cols) */}
                    {/* Quick Search - 2 columns, 1 row (half height) */}
                    <DashboardGridItem colSpan={2} rowSpan={1}>
                        <DashboardCard
                            variant="medium"
                            title="Quick Search"
                            className="h-full"
                        >
                            {' '}
                            <QuickSearchCard />
                        </DashboardCard>
                    </DashboardGridItem>

                    {/* Search Intelligence + Search Volume Chart - 4 columns, 2 rows */}
                    <DashboardGridItem colSpan={4} rowSpan={2}>
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
                            <SearchIntelligence
                                metrics={[
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
                                ]}
                                topQueries={[
                                    {
                                        query: 'authentication flow',
                                        count: 47,
                                    },
                                    {
                                        query: 'api documentation',
                                        count: 38,
                                    },
                                    {
                                        query: 'deployment guide',
                                        count: 29,
                                    },
                                    {
                                        query: 'leetcode',
                                        count: 29,
                                    },
                                    {
                                        query: 'database',
                                        count: 29,
                                    },
                                ]}
                            />
                        </DashboardCard>
                    </DashboardGridItem>

                    {/* Workspace Overview - 2 columns, 1 row */}
                    <DashboardGridItem colSpan={2} rowSpan={1}>
                        <DashboardCard
                            variant="medium"
                            title="Workspace Overview"
                            className="h-full"
                        >
                            <WorkspaceOverviewCard
                                tenantId={session.activeTenantId}
                            />
                        </DashboardCard>
                    </DashboardGridItem>

                    {/* Reminder - 2 columns, 2 row */}
                    <DashboardGridItem colSpan={2} rowSpan={2}>
                        <RemindersCardProvider
                            tenantId={session.activeTenantId}
                            initialCount={remindersCount}
                        >
                            <DashboardCard
                                variant="medium"
                                title="Reminders"
                                action={<RemindersCardAction />}
                                className="h-full"
                            >
                                <RemindersCardContent />
                            </DashboardCard>
                        </RemindersCardProvider>
                    </DashboardGridItem>

                    {/* Knowledge network (2 cols)*/}
                    <DashboardGridItem colSpan={3} rowSpan={2}>
                        <DashboardCard
                            variant="medium"
                            title="Knowledge Network"
                            action={
                                <Button variant="ghost" size="sm">
                                    Explore
                                </Button>
                            }
                            className="h-full"
                        >
                            <TagNetworkGraph
                                documents={graphDocuments}
                                tags={tags}
                                fallback={
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        Not enough document data yet.
                                    </div>
                                }
                            />
                        </DashboardCard>
                    </DashboardGridItem>

                    {/* Tags List - 1 column, 2 rows */}
                    <DashboardGridItem colSpan={1} rowSpan={2}>
                        <DashboardCard
                            variant="medium"
                            title="Tags"
                            className="h-full"
                        >
                            <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
                                {tags.map((tag) => (
                                    <ClickableTag
                                        key={tag.id}
                                        tag={tag}
                                        href={`/documents?tag=${encodeURIComponent(
                                            tag.id
                                        )}`}
                                        count={tag.count}
                                    />
                                ))}
                            </div>
                        </DashboardCard>
                    </DashboardGridItem>

                    {/* Recent Activity - 3 columns, 2 rows */}
                    <DashboardGridItem colSpan={3} rowSpan={2}>
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
                            <div className="space-y-1.5 h-full flex flex-col min-h-0">
                                {[
                                    {
                                        type: 'TAG_ADDED_TO_DOCUMENT',
                                        user: 'Mike Johnson',
                                        action: 'tagged',
                                        target: 'API Documentation',
                                        detail: 'with "engineering"',
                                        time: '15m ago',
                                        Icon: TagIcon,
                                    },
                                    {
                                        type: 'DOCUMENT_FAVORITED',
                                        user: 'Alex Rivera',
                                        action: 'favorited',
                                        target: 'Team Handbook',
                                        time: '1h ago',
                                        Icon: Star,
                                    },
                                    {
                                        type: 'DOCUMENT_UPDATED',
                                        user: 'Sarah Chen',
                                        action: 'updated',
                                        target: 'Design System Guidelines',
                                        time: '2h ago',
                                        Icon: Pencil,
                                    },
                                    {
                                        type: 'DOCUMENT_UPDATED',
                                        user: 'Sarah Chen',
                                        action: 'updated',
                                        target: 'Design System Guidelines',
                                        time: '2h ago',
                                        Icon: Pencil,
                                    },
                                ].map((activity, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-1.5 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="mt-0.5">
                                            <activity.Icon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[0.8rem] leading-relaxed">
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
                    </DashboardGridItem>

                    {/* Index Pipeline Status - 3 columns, 2 rows */}
                    <DashboardGridItem colSpan={3} rowSpan={2}>
                        <DashboardCard
                            variant="large"
                            title="Indexing Pipeline Status"
                            action={
                                <Button variant="ghost" size="sm">
                                    View Queue
                                </Button>
                            }
                            className="h-full"
                        >
                            <IndexingPipelineStatus
                                tenantId={session.activeTenantId}
                            />
                        </DashboardCard>
                    </DashboardGridItem>
                </DashboardGrid>
            </div>
        </div>
    );
}

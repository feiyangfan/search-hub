import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EmptyStateCreateWorkspace } from '@/components/workspace/empty-state-create-workspace';
import { DashboardCard } from '@/components/dashboard/dashboard-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { SearchHubClient } from '@search-hub/sdk';
import { TagOption, DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import {
    DashboardGrid,
    DashboardGridItem,
} from '@/components/dashboard/dashboard-grid';
import { TagNetworkGraph } from '@/components/dashboard/tag-network-graph';
import {
    type TagNetworkEdge,
    type TagNetworkNode,
} from '@/components/dashboard/tag-network-graph.client';
import { IndexingPipelineStatus } from '@/components/dashboard/indexing-pipeline-status';
import { SearchIntelligence } from '@/components/dashboard/search-intelligence';
import {
    Bell,
    Calendar,
    FileText,
    Tag as TagIcon,
    Star,
    Pencil,
} from 'lucide-react';
import type { TagListItemType } from '@search-hub/schemas';

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
    let graphNodes: TagNetworkNode[] = [];
    let graphEdges: TagNetworkEdge[] = [];

    if (apiSessionCookie) {
        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        try {
            const response = await client.getTags();
            const apiTags = (response.tags ?? []) as TagListItemType[];
            tags = apiTags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color ?? DEFAULT_TAG_COLOR,
                description: undefined,
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
                        return { document, tags: [] as { id: string; name: string; color?: string | null }[] };
                    }
                })
            );

            const tagUsage = new Map<string, number>();
            const docTagIndex = new Map<
                string,
                { id: string; name: string; color?: string | null }
            >();
            const edges: TagNetworkEdge[] = [];
            const documentNodes: TagNetworkNode[] = [];

            for (const { document, tags: documentTags } of documentsWithTags) {
                if (!documentTags.length) {
                    continue;
                }

                const primaryTagWithColor = documentTags.find(
                    (tag) => tag.color
                );
                const fallbackColor = documentTags[0]?.color;
                const nodeColor =
                    primaryTagWithColor?.color ??
                    fallbackColor ??
                    DEFAULT_TAG_COLOR;

                documentNodes.push({
                    id: `doc-${document.id}`,
                    label: document.title ?? 'Untitled document',
                    type: 'document',
                    color: nodeColor,
                    size: Math.min(11, 6 + documentTags.length * 1.3),
                });

                for (const tag of documentTags) {
                    tagUsage.set(tag.id, (tagUsage.get(tag.id) ?? 0) + 1);
                    if (!docTagIndex.has(tag.id)) {
                        docTagIndex.set(tag.id, {
                            id: tag.id,
                            name: tag.name,
                            color: tag.color,
                        });
                    }
                    edges.push({
                        source: `tag-${tag.id}`,
                        target: `doc-${document.id}`,
                    });
                }
            }

            const tagNodes: TagNetworkNode[] = [];
            const seenTagIds = new Set<string>();

            for (const tag of tags) {
                const usageCount = tagUsage.get(tag.id) ?? 0;
                tagNodes.push({
                    id: `tag-${tag.id}`,
                    label: tag.name,
                    type: 'tag' as const,
                    color: tag.color ?? DEFAULT_TAG_COLOR,
                    size: Math.min(14, 8 + usageCount * 1.5),
                });
                seenTagIds.add(tag.id);
            }

            for (const tag of docTagIndex.values()) {
                if (seenTagIds.has(tag.id)) {
                    continue;
                }
                const usageCount = tagUsage.get(tag.id) ?? 0;
                tagNodes.push({
                    id: `tag-${tag.id}`,
                    label: tag.name,
                    type: 'tag',
                    color: tag.color ?? DEFAULT_TAG_COLOR,
                    size: Math.min(14, 8 + usageCount * 1.5),
                });
            }

            const validNodeIds = new Set([
                ...tagNodes.map((node) => node.id),
                ...documentNodes.map((node) => node.id),
            ]);

            graphNodes = [...tagNodes, ...documentNodes];
            graphEdges = edges.filter(
                (edge) =>
                    validNodeIds.has(edge.source) &&
                    validNodeIds.has(edge.target)
            );
        } catch (error) {
            console.error('Failed to build tag network graph:', error);
        }
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] w-full overflow-y-auto lg:overflow-hidden px-6 py-6">
            <DashboardGrid className="lg:h-full">
                {/* Row 1: Quick Search (2 cols) + Search Intelligence (4 cols) */}
                {/* Quick Search - 2 columns, 1 row (half height) */}
                <DashboardGridItem colSpan={2} rowSpan={1}>
                    <DashboardCard
                        variant="medium"
                        title="Quick Search"
                        className="h-full"
                    >
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search across documents..."
                                className="flex-1"
                            />
                            <Button>Search</Button>
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Search Intelligence + Search Volume Chart - 4 columns, 3 rows */}
                <DashboardGridItem colSpan={4} rowSpan={3}>
                    <DashboardCard
                        variant="large"
                        title="Search Intelligence"
                        description="Performance metrics"
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
                        <div className="h-full flex items-center">
                            {/* Stats Grid - Content + Collaboration */}
                            <div className="grid grid-cols-3 gap-3 w-full">
                                <div className="space-y-0.5">
                                    <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide">
                                        Documents
                                    </p>
                                    <p className="text-xl font-bold">47</p>
                                    <p className="text-[0.65rem] text-muted-foreground">
                                        +3 this week
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide">
                                        Collaborators
                                    </p>
                                    <p className="text-xl font-bold">5</p>
                                    <p className="text-[0.65rem] text-muted-foreground">
                                        members
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wide">
                                        Tags
                                    </p>
                                    <p className="text-xl font-bold">
                                        {tags.length}
                                    </p>
                                    <p className="text-[0.65rem] text-muted-foreground">
                                        categories
                                    </p>
                                </div>
                            </div>
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Reminder - 2 columns, 2 row */}
                <DashboardGridItem colSpan={2} rowSpan={2}>
                    <DashboardCard
                        variant="medium"
                        title="Reminders"
                        description="Upcoming notifications"
                        action={
                            <Button variant="ghost" size="sm">
                                View all
                            </Button>
                        }
                        className="h-full"
                    >
                        <div className="space-y-2 h-full flex flex-col min-h-0">
                            {[
                                {
                                    content: 'Review Q4 roadmap',
                                    time: 'Today at 3:00 PM',
                                    timeLeft: 'in 2h',
                                    variant: 'urgent' as const,
                                    Icon: Bell,
                                },
                                {
                                    content: 'Team sync meeting prep',
                                    time: 'Tomorrow at 10:00 AM',
                                    timeLeft: 'in 18h',
                                    variant: 'normal' as const,
                                    Icon: Calendar,
                                },
                                {
                                    content: 'Update API documentation',
                                    time: 'Friday at 2:00 PM',
                                    timeLeft: 'in 3d',
                                    variant: 'normal' as const,
                                    Icon: FileText,
                                },
                            ].map((reminder, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-start gap-2 rounded-lg border p-2 transition-all hover:shadow-sm ${
                                        reminder.variant === 'urgent'
                                            ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
                                            : 'border-border/50 bg-muted/20'
                                    }`}
                                >
                                    <div className="mt-0.5">
                                        <reminder.Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground mb-1">
                                            {reminder.content}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    reminder.variant ===
                                                    'urgent'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                className={`text-[0.65rem] h-4 px-1.5 ${
                                                    reminder.variant ===
                                                    'urgent'
                                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                        : ''
                                                }`}
                                            >
                                                {reminder.timeLeft}
                                            </Badge>
                                            <span className="text-[0.65rem] text-muted-foreground">
                                                {reminder.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DashboardCard>
                </DashboardGridItem>

                {/* Knowledge network (2 cols)*/}
                <DashboardGridItem colSpan={2} rowSpan={3}>
                    <DashboardCard
                        variant="medium"
                        title="Knowledge Network"
                        description="Document and tag relationships"
                        action={
                            <Button variant="ghost" size="sm">
                                Explore
                            </Button>
                        }
                        className="h-full"
                    >
                        <TagNetworkGraph nodes={graphNodes} edges={graphEdges} />
                    </DashboardCard>
                </DashboardGridItem>

                {/* Row 5: Index Pipeline Status - 2 columns, 3 rows */}
                <DashboardGridItem colSpan={2} rowSpan={3}>
                    <DashboardCard
                        variant="large"
                        title="Indexing Pipeline Status"
                        description="Document processing and embedding generation"
                        action={
                            <Button variant="ghost" size="sm">
                                View Queue
                            </Button>
                        }
                        className="h-full"
                    >
                        <IndexingPipelineStatus
                            stats={{
                                failed: 3,
                                processing: 2,
                                queued: 12,
                                indexed: 234,
                                activeWorkers: { current: 2, max: 5 },
                                queueWaitTime: '~3m',
                                indexedToday: 18,
                            }}
                            recentJobs={[
                                {
                                    id: '1',
                                    documentName: 'Team Handbook.md',
                                    status: 'failed',
                                    statusLabel: 'Failed',
                                    icon: '⚠️',
                                    details:
                                        'Error: Voyage AI rate limit exceeded · Retry 3/3 · 5m ago',
                                    hasAction: true,
                                    actionLabel: 'Retry',
                                },
                                {
                                    id: '2',
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
                                    id: '3',
                                    documentName: 'Deployment Guide.md',
                                    status: 'queued',
                                    statusLabel: 'Queued',
                                    icon: '⏳',
                                    details: 'Estimated wait: ~4m · 8.2 KB',
                                    queuePosition: 3,
                                },
                                {
                                    id: '4',
                                    documentName: 'Design System Guidelines.md',
                                    status: 'indexed',
                                    statusLabel: 'Indexed',
                                    icon: '✓',
                                    details:
                                        'Completed in 2.3s · 156 chunks · 2m ago',
                                },
                            ]}
                            showRetryAll={true}
                        />
                    </DashboardCard>
                </DashboardGridItem>

                {/* Recent Activity - 2 columns, 2 rows */}
                <DashboardGridItem colSpan={2} rowSpan={2}>
                    <DashboardCard
                        variant="medium"
                        title="Recent Activity"
                        description="Latest workspace actions"
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
            </DashboardGrid>
        </div>
    );
}

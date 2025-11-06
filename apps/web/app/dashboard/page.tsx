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
import {
    DashboardGrid,
    DashboardGridItem,
} from '@/components/dashboard/dashboard-grid';
import { SearchVolumeChart } from '@/components/dashboard/search-volume-chart';
import { TagNetworkGraph } from '@/components/dashboard/tag-network-graph';
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
                        <TagNetworkGraph
                            nodes={[
                                // Tags (larger, inner circle)
                                {
                                    id: 'tag-1',
                                    label: 'Engineering',
                                    type: 'tag',
                                    color: '#3b82f6',
                                    size: 16,
                                },
                                {
                                    id: 'tag-2',
                                    label: 'Design',
                                    type: 'tag',
                                    color: '#ec4899',
                                    size: 14,
                                },
                                {
                                    id: 'tag-3',
                                    label: 'Product',
                                    type: 'tag',
                                    color: '#8b5cf6',
                                    size: 15,
                                },
                                {
                                    id: 'tag-4',
                                    label: 'Documentation',
                                    type: 'tag',
                                    color: '#10b981',
                                    size: 13,
                                },
                                // Documents (smaller, outer circle)
                                {
                                    id: 'doc-1',
                                    label: 'API Guide',
                                    type: 'document',
                                    color: '#3b82f6',
                                    size: 8,
                                },
                                {
                                    id: 'doc-2',
                                    label: 'Team Handbook',
                                    type: 'document',
                                    color: '#3b82f6',
                                    size: 7,
                                },
                                {
                                    id: 'doc-3',
                                    label: 'Design System',
                                    type: 'document',
                                    color: '#ec4899',
                                    size: 9,
                                },
                                {
                                    id: 'doc-4',
                                    label: 'UI Components',
                                    type: 'document',
                                    color: '#ec4899',
                                    size: 6,
                                },
                                {
                                    id: 'doc-5',
                                    label: 'Roadmap Q4',
                                    type: 'document',
                                    color: '#8b5cf6',
                                    size: 7,
                                },
                                {
                                    id: 'doc-6',
                                    label: 'User Research',
                                    type: 'document',
                                    color: '#8b5cf6',
                                    size: 6,
                                },
                                {
                                    id: 'doc-7',
                                    label: 'Setup Guide',
                                    type: 'document',
                                    color: '#10b981',
                                    size: 8,
                                },
                                {
                                    id: 'doc-8',
                                    label: 'Architecture',
                                    type: 'document',
                                    color: '#3b82f6',
                                    size: 7,
                                },
                                {
                                    id: 'doc-9',
                                    label: 'Guidelines',
                                    type: 'document',
                                    color: '#10b981',
                                    size: 6,
                                },
                            ]}
                            edges={[
                                // Engineering tag connections
                                { source: 'tag-1', target: 'doc-1' },
                                { source: 'tag-1', target: 'doc-2' },
                                { source: 'tag-1', target: 'doc-8' },
                                // Design tag connections
                                { source: 'tag-2', target: 'doc-3' },
                                { source: 'tag-2', target: 'doc-4' },
                                // Product tag connections
                                { source: 'tag-3', target: 'doc-5' },
                                { source: 'tag-3', target: 'doc-6' },
                                { source: 'tag-3', target: 'doc-2' }, // Cross-connection
                                // Documentation tag connections
                                { source: 'tag-4', target: 'doc-7' },
                                { source: 'tag-4', target: 'doc-9' },
                                { source: 'tag-4', target: 'doc-1' }, // Cross-connection
                                // Additional cross-connections
                                { source: 'tag-2', target: 'doc-9' },
                                { source: 'tag-1', target: 'doc-7' },
                            ]}
                        />
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

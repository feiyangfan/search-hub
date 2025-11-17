'use client';

import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDocumentActions } from '@/hooks/use-document-actions';

const placeholderDocuments = [
    {
        id: 'doc-1',
        title: 'Authentication Runbook',
        summary:
            'Step-by-step guide for handling auth outages across services.',
        tags: ['Backend', 'Incident'],
        updated: '2 hours ago',
        owner: 'DevOps',
    },
    {
        id: 'doc-2',
        title: 'Design System 2.0',
        summary: 'Launch checklist and rollout plan for the design revamp.',
        tags: ['Design', 'Launch'],
        updated: 'Yesterday',
        owner: 'Design Ops',
    },
    {
        id: 'doc-3',
        title: 'Database Migration Plan',
        summary: 'Shard split strategy and validation playbook.',
        tags: ['Database', 'Migration'],
        updated: '3 days ago',
        owner: 'Data Platform',
    },
];

const quickFilters = [
    { label: 'All', active: true },
    { label: 'Favorites', active: false },
    { label: 'Recently updated', active: false },
    { label: 'Owned by me', active: false },
];

const tagFilters = ['Backend', 'Design', 'Launch', 'Incident'];

export default function DocumentsPage() {
    const { createDocument, createDocumentPending } = useDocumentActions();
    const handleNewDocument = useCallback(async () => {
        try {
            await createDocument();
        } catch {
            // Toast handled inside useDocumentActions
        }
    }, [createDocument]);

    return (
        <div className="flex flex-1 flex-col gap-6 bg-muted/5 px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                        Workspace catalog
                    </p>
                    <h1 className="text-3xl font-bold">Documents</h1>
                    <p className="text-sm text-muted-foreground">
                        Filter by tags, freshness, or owner to surface the docs
                        you need. (Placeholder view)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Invite collaborator</Button>
                    <Button
                        onClick={handleNewDocument}
                        disabled={createDocumentPending}
                    >
                        {createDocumentPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'New document'
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="gap-3">
                    <CardTitle>Filters</CardTitle>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                            {quickFilters.map((filter) => (
                                <Button
                                    key={filter.label}
                                    variant={filter.active ? 'default' : 'outline'}
                                    size="sm"
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tagFilters.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="px-3 py-1 text-xs"
                                >
                                    #{tag}
                                </Badge>
                            ))}
                            <Button variant="ghost" size="sm">
                                + Add tag filter
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Input
                                placeholder="Filter by owner"
                                className="w-48"
                                readOnly
                            />
                            <Input
                                placeholder="Last updated: last 30 days"
                                className="w-56"
                                readOnly
                            />
                            <Input
                                placeholder="Sort by: Recently updated"
                                className="w-64"
                                readOnly
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Separator />

            <div className="grid gap-4">
                {placeholderDocuments.map((doc) => (
                    <Card key={doc.id}>
                        <CardContent className="flex flex-wrap justify-between gap-4 py-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-semibold">{doc.title}</h2>
                                    <Badge variant="outline">Draft</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {doc.summary}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {doc.tags.map((tag) => (
                                        <Badge key={`${doc.id}-${tag}`} variant="secondary">
                                            #{tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                                <div>Owner: {doc.owner}</div>
                                <div>Updated: {doc.updated}</div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm">
                                        Open
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        More
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="rounded-2xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
                Placeholder pagination and empty states will live here once data
                wiring is complete.
            </div>
        </div>
    );
}

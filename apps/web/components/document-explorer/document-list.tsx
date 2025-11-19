import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { DocumentListItemType } from '@search-hub/schemas';

type DocumentExplorerListProps = {
    documents: DocumentListItemType[];
    isLoading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
};

const DEFAULT_OWNER = 'Workspace';
const DEFAULT_SUMMARY = 'No description yet.';

function normalizeMetadata(metadata: unknown) {
    if (
        metadata &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata)
    ) {
        return metadata as Record<string, unknown>;
    }
    return undefined;
}

export function DocumentExplorerList({
    documents,
    isLoading,
    hasMore,
    onLoadMore,
    isLoadingMore,
    emptyTitle = 'No documents match your filters',
    emptyDescription = 'Adjust the tag selection or search query to explore the placeholder data set.',
}: DocumentExplorerListProps) {
    const renderDocuments = documents.map((doc) => {
        const metadata = normalizeMetadata(doc.metadata);
        const summary =
            typeof metadata?.summary === 'string'
                ? metadata.summary
                : DEFAULT_SUMMARY;
        const owner =
            typeof metadata?.owner === 'string'
                ? metadata.owner
                : DEFAULT_OWNER;
        const tags = Array.isArray(metadata?.tags)
            ? (metadata?.tags.filter((tag) => typeof tag === 'string') as string[])
            : [];

        return (
            <Link
                key={doc.id}
                href={`/doc/${doc.id}`}
                className="block rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                            {owner}
                        </p>
                        <h3 className="text-base font-semibold">
                            {doc.title || 'Untitled document'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {summary}
                        </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Updated {new Date(doc.updatedAt).toLocaleString()}
                    </div>
                </div>
                {tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <Badge
                                key={`${doc.id}-${tag}`}
                                variant="secondary"
                                className="text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </Link>
        );
    });

    return (
        <Card className="border bg-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Document List
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((key) => (
                            <div
                                key={key}
                                className="space-y-2 rounded-xl border border-border/60 p-4"
                            >
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <p className="text-base font-medium">{emptyTitle}</p>
                        <p className="text-sm text-muted-foreground">
                            {emptyDescription}
                        </p>
                    </div>
                ) : (
                    <>
                        {renderDocuments}
                        {hasMore && onLoadMore && (
                            <button
                                type="button"
                                onClick={onLoadMore}
                                disabled={isLoadingMore}
                                className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isLoadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type DocumentExplorerListItem = {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    owner: string;
    updatedLabel: string;
};

type DocumentExplorerListProps = {
    documents: DocumentExplorerListItem[];
    emptyTitle?: string;
    emptyDescription?: string;
};

export function DocumentExplorerList({
    documents,
    emptyTitle = 'No documents match your filters',
    emptyDescription = 'Adjust the tag selection or search query to explore the placeholder data set.',
}: DocumentExplorerListProps) {
    return (
        <Card className="border bg-card">
            <CardContent className="space-y-4 pl-6 pr-6 pb-4">
                <div>
                    <span className="text-base font-semibold">
                        Document List
                    </span>
                </div>
                {documents.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <p className="text-base font-medium">{emptyTitle}</p>
                        <p className="text-sm text-muted-foreground">
                            {emptyDescription}
                        </p>
                    </div>
                ) : (
                    documents.map((doc) => (
                        <Link
                            key={doc.id}
                            href={`/doc/${doc.id}`}
                            className="block rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                        >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm uppercase tracking-wide text-muted-foreground">
                                        {doc.owner}
                                    </p>
                                    <h3 className="text-base font-semibold">
                                        {doc.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {doc.summary}
                                    </p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Updated {doc.updatedLabel}
                                </div>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {doc.tags.map((tag) => (
                                    <Badge
                                        key={`${doc.id}-${tag}`}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </Link>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

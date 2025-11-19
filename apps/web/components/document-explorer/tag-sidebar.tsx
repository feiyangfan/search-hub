import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tag, type TagOption } from '@/components/ui/tag';

export type TagWithCount = TagOption & {
    count: number;
};

type DocumentExplorerTagSidebarProps = {
    tags: TagWithCount[];
    activeTags: string[];
    onToggleTag: (tagId: string) => void;
    className?: string;
    isLoading?: boolean;
};

export function DocumentExplorerTagSidebar({
    tags,
    activeTags,
    onToggleTag,
    className,
    isLoading = false,
}: DocumentExplorerTagSidebarProps) {
    const [query, setQuery] = useState('');

    const filteredTags = useMemo(() => {
        const criteria = query.toLowerCase();
        if (!criteria.trim()) {
            return tags;
        }
        return tags.filter((tag) => tag.name.toLowerCase().includes(criteria));
    }, [query, tags]);

    return (
        <aside className={cn('w-full lg:max-w-xs', className)}>
            <Card className="flex h-full flex-col overflow-hidden border bg-card lg:max-h-[calc(80vh-160px)]">
                <CardHeader>
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                            Tags
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Pick one or many tags to filter the explorer.
                        </p>
                    </div>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter tags..."
                        className="h-9"
                    />
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto border-t pt-4">
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">
                            Loading tags...
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {filteredTags.map((tag) => {
                                const isActive = activeTags.includes(tag.id);
                                return (
                                    <span
                                        key={tag.id}
                                        className="relative inline-flex"
                                    >
                                        <Tag
                                            tag={tag}
                                            className="pr-4 text-sm"
                                            isActive={isActive}
                                            onClick={() => onToggleTag(tag.id)}
                                        />
                                        <Badge
                                            variant="secondary"
                                            className="absolute -top-2 -right-2 h-5 min-w-[1.5rem] justify-center px-1 text-[10px] bg-white"
                                        >
                                            {tag.count}
                                        </Badge>
                                    </span>
                                );
                            })}
                            {filteredTags.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No tags match &ldquo;{query}&rdquo;.
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </aside>
    );
}

'use client';

import { useCallback, useMemo, useState } from 'react';

import {
    DocumentExplorerTagSidebar,
    type TagWithCount,
} from '@/components/document-explorer/tag-sidebar';
import { DocumentExplorerList } from '@/components/document-explorer/document-list';
import { DocumentExplorerFilters } from '@/components/document-explorer/filters';
import { DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import { useInfiniteDocumentsQuery, useWorkspaceTagsQuery } from '@/hooks/use-documents';
import { DOCUMENTS_PAGE_TAGS_PARAMS } from '@/queries/tags';
import type { DocumentListItemType } from '@search-hub/schemas';

const DOCUMENTS_PAGE_SIZE = 20;

type NormalizedMetadata = {
    summary: string;
    tags: string[];
    owner: string;
    hasReminder: boolean;
    ownedByMe: boolean;
};

export default function DocumentsPage() {
    const { data: workspaceTags = [], isLoading: tagsLoading } =
        useWorkspaceTagsQuery(DOCUMENTS_PAGE_TAGS_PARAMS);
    const {
        data: documentsData,
        isLoading: documentsLoading,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = useInfiniteDocumentsQuery({
        limit: DOCUMENTS_PAGE_SIZE,
    });
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest');
    const [hasReminderOnly, setHasReminderOnly] = useState(false);
    const [myDocsOnly, setMyDocsOnly] = useState(false);

    const toggleTag = useCallback((tagId: string) => {
        setActiveTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    }, []);

    const tagFilters = useMemo<TagWithCount[]>(() => {
        return (workspaceTags ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            description: tag.description ?? undefined,
            color: tag.color ?? DEFAULT_TAG_COLOR,
            count: tag.documentCount ?? 0,
        }));
    }, [workspaceTags]);

    const tagLookup = useMemo(() => {
        const map = new Map<string, TagWithCount>();
        for (const tag of tagFilters) {
            map.set(tag.id, tag);
        }
        return map;
    }, [tagFilters]);

    const activeTagNames = useMemo(() => {
        return activeTags
            .map((id) => tagLookup.get(id)?.name.toLowerCase())
            .filter((name): name is string => Boolean(name));
    }, [activeTags, tagLookup]);

    const documents = useMemo<DocumentListItemType[]>(() => {
        if (!documentsData?.pages) {
            return [];
        }
        return documentsData.pages.flatMap((page) => page.items ?? []);
    }, [documentsData]);

    const filteredDocuments = useMemo(() => {
        const results = documents.filter((doc) => {
            const tagNames = (doc.tags ?? []).map((tag) =>
                tag.name.toLowerCase()
            );
            const matchesTag =
                activeTagNames.length === 0 ||
                tagNames.some((tag) => activeTagNames.includes(tag));
            const matchesSearch =
                searchQuery.trim().length === 0 ||
                (doc.title ?? 'Untitled document')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                (doc.summary ?? '')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            const matchesReminder =
                !hasReminderOnly || doc.hasReminders;
            const matchesOwnership = !myDocsOnly || doc.ownedByMe;
            return (
                matchesTag &&
                matchesSearch &&
                matchesReminder &&
                matchesOwnership
            );
        });

        return results.sort((a, b) => {
            const aTime = new Date(a.updatedAt).getTime();
            const bTime = new Date(b.updatedAt).getTime();
            return sortOption === 'newest' ? bTime - aTime : aTime - bTime;
        });
    }, [
        documents,
        activeTagNames,
        searchQuery,
        hasReminderOnly,
        myDocsOnly,
        sortOption,
    ]);

    const activeTagPill = activeTags.length
        ? `${activeTags.length} filter${
              activeTags.length > 1 ? 's' : ''
          } applied`
        : 'No tag filters applied';

    return (
        <div className="flex flex-1 flex-col gap-6 bg-muted/5 px-6 py-6">
            <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                <DocumentExplorerTagSidebar
                    tags={tagFilters}
                    activeTags={activeTags}
                    onToggleTag={toggleTag}
                    isLoading={tagsLoading}
                />
                <section className="flex flex-1 flex-col gap-4">
                    <DocumentExplorerFilters
                        summary={activeTagPill}
                        resultCount={filteredDocuments.length}
                        searchQuery={searchQuery}
                        onSearchChange={(value) => setSearchQuery(value)}
                        sortOption={sortOption}
                        onSortChange={(value) => setSortOption(value)}
                        hasReminderOnly={hasReminderOnly}
                        onHasReminderChange={(value) =>
                            setHasReminderOnly(value)
                        }
                        myDocsOnly={myDocsOnly}
                        onMyDocsChange={(value) => setMyDocsOnly(value)}
                    />

                    <DocumentExplorerList
                        documents={filteredDocuments}
                        isLoading={documentsLoading}
                        hasMore={Boolean(hasNextPage)}
                        onLoadMore={() => fetchNextPage()}
                        isLoadingMore={isFetchingNextPage}
                    />
                </section>
            </div>
        </div>
    );
}

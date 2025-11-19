'use client';

import { useCallback, useMemo, useState } from 'react';

import {
    DocumentExplorerTagSidebar,
    type TagWithCount,
} from '@/components/document-explorer/tag-sidebar';
import { DocumentExplorerList } from '@/components/document-explorer/document-list';
import { DocumentExplorerFilters } from '@/components/document-explorer/filters';
import { DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useWorkspaceTagsQuery } from '@/hooks/use-documents';
import { DOCUMENTS_PAGE_TAGS_PARAMS } from '@/queries/tags';

type PlaceholderDocument = {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    updatedLabel: string;
    updatedAt: number;
    owner: string;
    isFavorite: boolean;
    hasReminder: boolean;
    ownedByMe: boolean;
};

const placeholderDocuments: PlaceholderDocument[] = [
    {
        id: 'doc-1',
        title: 'Authentication Runbook',
        summary:
            'Step-by-step guide for handling auth outages across services.',
        tags: ['Backend', 'Incident'],
        updatedLabel: '2 hours ago',
        updatedAt: Date.now() - 1000 * 60 * 60 * 2,
        owner: 'DevOps',
        isFavorite: true,
        hasReminder: true,
        ownedByMe: true,
    },
    {
        id: 'doc-2',
        title: 'Design System 2.0',
        summary: 'Launch checklist and rollout plan for the design revamp.',
        tags: ['Design', 'Launch'],
        updatedLabel: 'Yesterday',
        updatedAt: Date.now() - 1000 * 60 * 60 * 24,
        owner: 'Design Ops',
        isFavorite: false,
        hasReminder: false,
        ownedByMe: false,
    },
    {
        id: 'doc-3',
        title: 'Database Migration Plan',
        summary: 'Shard split strategy and validation playbook.',
        tags: ['Database', 'Migration'],
        updatedLabel: '3 days ago',
        updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        owner: 'Data Platform',
        isFavorite: false,
        hasReminder: true,
        ownedByMe: false,
    },
];

export default function DocumentsPage() {
    const { data: workspaceTags = [], isLoading: tagsLoading } =
        useWorkspaceTagsQuery(DOCUMENTS_PAGE_TAGS_PARAMS);
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

    const filteredDocuments = useMemo(() => {
        const results = placeholderDocuments.filter((doc) => {
            const matchesTag =
                activeTagNames.length === 0 ||
                doc.tags.some((tag) =>
                    activeTagNames.includes(tag.toLowerCase())
                );
            const matchesSearch =
                searchQuery.trim().length === 0 ||
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.summary.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesReminder = !hasReminderOnly || doc.hasReminder;
            const matchesOwnership = !myDocsOnly || doc.ownedByMe;
            return (
                matchesTag &&
                matchesSearch &&
                matchesReminder &&
                matchesOwnership
            );
        });
        return results.sort((a, b) =>
            sortOption === 'newest'
                ? b.updatedAt - a.updatedAt
                : a.updatedAt - b.updatedAt
        );
    }, [activeTagNames, searchQuery, hasReminderOnly, myDocsOnly, sortOption]);

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

                    <DocumentExplorerList documents={filteredDocuments} />
                </section>
            </div>
        </div>
    );
}

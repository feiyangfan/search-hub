import { Suspense, type ReactNode } from 'react';

import {
    TagNetworkGraphClient,
    TagNetworkEdge,
    TagNetworkNode,
} from './tag-network-graph.client';
import { DEFAULT_TAG_COLOR, type TagOption } from '@/components/ui/tag';

export type GraphDocumentInput = {
    id: string;
    title?: string | null;
    tags: {
        id: string;
        name: string;
        color?: string | null;
    }[];
};

interface TagNetworkGraphProps {
    documents: GraphDocumentInput[];
    tags?: TagOption[];
    fallback?: ReactNode;
    selectedTagId?: string | null;
    onSelectTag?: (tagId: string | null) => void;
}

function buildGraphData(
    documents: GraphDocumentInput[],
    tags: TagOption[] = []
): { nodes: TagNetworkNode[]; edges: TagNetworkEdge[] } {
    const tagUsage = new Map<string, number>();
    const tagMetadata = new Map<
        string,
        { id: string; name: string; color?: string | null }
    >();
    const documentNodes: TagNetworkNode[] = [];
    const edges: TagNetworkEdge[] = [];

    const registerTagMeta = (tag: { id: string; name: string; color?: string | null }) => {
        if (!tagMetadata.has(tag.id)) {
            tagMetadata.set(tag.id, tag);
        }
    };

    for (const doc of documents) {
        if (!doc.tags.length) {
            continue;
        }

        const primaryColor = doc.tags.find((tag) => tag.color)?.color;
        const fallbackColor = doc.tags[0]?.color;
        const nodeColor = primaryColor ?? fallbackColor ?? DEFAULT_TAG_COLOR;

        documentNodes.push({
            id: `doc-${doc.id}`,
            label: doc.title ?? 'Untitled document',
            type: 'document',
            color: nodeColor,
            size: Math.min(11, 6 + doc.tags.length * 1.3),
        });

        for (const tag of doc.tags) {
            tagUsage.set(tag.id, (tagUsage.get(tag.id) ?? 0) + 1);
            registerTagMeta(tag);
            edges.push({
                source: `tag-${tag.id}`,
                target: `doc-${doc.id}`,
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
            type: 'tag',
            color: tag.color ?? DEFAULT_TAG_COLOR,
            size: Math.min(14, 8 + usageCount * 1.5),
        });
        seenTagIds.add(tag.id);
    }

    for (const tag of tagMetadata.values()) {
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

    const validIds = new Set([
        ...tagNodes.map((node) => node.id),
        ...documentNodes.map((node) => node.id),
    ]);

    const resolveId = (value: string | TagNetworkNode): string =>
        typeof value === 'string' ? value : value.id;

    const filteredEdges = edges.filter((edge) => {
        const sourceId = resolveId(edge.source);
        const targetId = resolveId(edge.target);
        return validIds.has(sourceId) && validIds.has(targetId);
    });

    return {
        nodes: [...tagNodes, ...documentNodes],
        edges: filteredEdges,
    };
}

export function TagNetworkGraph({
    documents,
    tags = [],
    fallback = (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No tag data available yet.
        </div>
    ),
    selectedTagId,
    onSelectTag,
}: TagNetworkGraphProps) {
    const { nodes, edges } = buildGraphData(documents, tags);

    if (!nodes.length) {
        return <>{fallback}</>;
    }

    return (
        <Suspense
            fallback={
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Loading graph...
                </div>
            }
        >
            <TagNetworkGraphClient
                nodes={nodes}
                edges={edges}
                activeTagId={selectedTagId}
                onSelectTag={onSelectTag}
            />
        </Suspense>
    );
}

import { Suspense, type ReactNode } from 'react';

import {
    TagNetworkGraphClient,
    TagNetworkEdge,
    TagNetworkNode,
} from './tag-network-graph.client';

interface TagNetworkGraphProps {
    nodes: TagNetworkNode[];
    edges: TagNetworkEdge[];
    fallback?: ReactNode;
}

export function TagNetworkGraph({
    nodes,
    edges,
    fallback = (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No tag data available yet.
        </div>
    ),
}: TagNetworkGraphProps) {
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
            <TagNetworkGraphClient nodes={nodes} edges={edges} />
        </Suspense>
    );
}

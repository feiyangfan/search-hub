import { useQuery } from '@tanstack/react-query';
import {
    workspaceOverviewQueryKey,
    indexingStatusQueryKey,
    type WorkspaceOverviewData,
} from '@/queries/workspace';
import type { IndexingStatusResponse } from '@search-hub/schemas';

export function useWorkspaceOverviewQuery(tenantId?: string) {
    return useQuery({
        queryKey: tenantId
            ? workspaceOverviewQueryKey(tenantId)
            : ['workspace', 'overview', 'missing'],
        queryFn: async () => {
            const response = await fetch(`/api/tenants/${tenantId}/stats`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to load workspace overview');
            }

            return (await response.json()) as WorkspaceOverviewData;
        },
        enabled: Boolean(tenantId),
    });
}

export function useIndexingStatusQuery(tenantId?: string) {
    return useQuery({
        queryKey: tenantId
            ? indexingStatusQueryKey(tenantId)
            : ['admin', 'indexing', 'missing'],
        queryFn: async () => {
            const response = await fetch('/api/admin/indexing', {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to load indexing status');
            }

            const data = (await response.json()) as IndexingStatusResponse;
            console.log('🔍 Indexing Status Data:', data);
            return data;
        },
        enabled: Boolean(tenantId),
        refetchInterval: 30000, // Refresh every 30 seconds for live updates
    });
}

import { useQuery } from '@tanstack/react-query';
import {
    workspaceOverviewQueryKey,
    type WorkspaceOverviewData,
} from '@/queries/workspace';

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

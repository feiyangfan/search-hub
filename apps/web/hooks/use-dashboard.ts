import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    workspaceOverviewQueryKey,
    indexingStatusQueryKey,
    searchAnalyticsQueryKey,
    topQueriesQueryKey,
    recentSearchesQueryKey,
    type WorkspaceOverviewData,
} from '@/queries/workspace';
import type {
    IndexingStatusResponse,
    SearchAnalyticsResponse,
    TopQueriesResponse,
    RecentSearchesResponse,
} from '@search-hub/schemas';

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

export function useSearchAnalyticsQuery(tenantId?: string) {
    return useQuery({
        queryKey: tenantId
            ? searchAnalyticsQueryKey(tenantId)
            : ['search-analytics', 'metrics', 'missing'],
        queryFn: async () => {
            const response = await fetch(
                '/api/search-analytics/metrics?includeComparison=true',
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load search analytics');
            }

            return (await response.json()) as SearchAnalyticsResponse;
        },
        enabled: Boolean(tenantId),
        refetchInterval: 15000, // Refresh every 15 seconds for near real-time updates
        refetchOnWindowFocus: true, // Refetch when user switches back to tab
    });
}

export function useTopQueriesQuery(tenantId?: string, limit = 10) {
    return useQuery({
        queryKey: tenantId
            ? topQueriesQueryKey(tenantId, limit)
            : ['search-analytics', 'top-queries', 'missing'],
        queryFn: async () => {
            const response = await fetch(
                `/api/search-analytics/top-queries?limit=${limit}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load top queries');
            }

            return (await response.json()) as TopQueriesResponse;
        },
        enabled: Boolean(tenantId),
        refetchInterval: 15000, // Refresh every 15 seconds for near real-time updates
        refetchOnWindowFocus: true, // Refetch when user switches back to tab
    });
}

export function useRecentSearchesQuery(tenantId?: string, limit = 3) {
    return useQuery({
        queryKey: tenantId
            ? recentSearchesQueryKey(tenantId, limit)
            : ['search-analytics', 'recent', 'missing'],
        queryFn: async () => {
            const response = await fetch(
                `/api/search-analytics/recent?limit=${limit}`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load recent searches');
            }

            return (await response.json()) as RecentSearchesResponse;
        },
        enabled: Boolean(tenantId),
        refetchInterval: 15000, // Refresh every 15 seconds for near real-time updates
        refetchOnWindowFocus: true, // Refetch when user switches back to tab
    });
}

/**
 * Hook to invalidate search analytics queries after a search is performed.
 * This ensures that recent searches and search intelligence cards update immediately.
 */
export function useInvalidateSearchAnalytics() {
    const queryClient = useQueryClient();

    return () => {
        // Invalidate all search-analytics queries to trigger refetch
        queryClient.invalidateQueries({
            queryKey: ['search-analytics'],
        });
    };
}

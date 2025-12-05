import type { GetTenantWithStatsResponse } from '@search-hub/schemas';

export type WorkspaceOverviewData = GetTenantWithStatsResponse;

export const workspaceOverviewQueryKey = (tenantId: string) =>
    ['workspace', tenantId, 'overview'] as const;

export const indexingStatusQueryKey = (tenantId: string) =>
    ['admin', 'indexing', tenantId] as const;

export const searchAnalyticsQueryKey = (tenantId: string) =>
    ['search-analytics', 'metrics', tenantId] as const;

export const topQueriesQueryKey = (tenantId: string, limit: number) =>
    ['search-analytics', 'top-queries', tenantId, limit] as const;

export const recentSearchesQueryKey = (tenantId: string, limit: number) =>
    ['search-analytics', 'recent', tenantId, limit] as const;

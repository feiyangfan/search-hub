import type { GetTenantWithStatsResponse } from '@search-hub/schemas';

export type WorkspaceOverviewData = GetTenantWithStatsResponse;

export const workspaceOverviewQueryKey = (tenantId: string) =>
    ['workspace', tenantId, 'overview'] as const;

export const indexingStatusQueryKey = (tenantId: string) =>
    ['admin', 'indexing', tenantId] as const;

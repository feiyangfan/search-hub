import type { GetTenantWithStatsResponse } from '@search-hub/schemas';

export type WorkspaceOverviewData = GetTenantWithStatsResponse;

export const workspaceOverviewQueryKey = (tenantId: string) =>
    ['workspace', tenantId, 'overview'] as const;

import type { ListTagsQueryType } from '@search-hub/schemas';

export type WorkspaceTagsQueryParams = Pick<
    ListTagsQueryType,
    'includeCount' | 'sortBy' | 'order'
>;

const defaultParams = Object.freeze({
    includeCount: false,
    sortBy: 'name',
    order: 'asc',
} satisfies Required<WorkspaceTagsQueryParams>);

export function normalizeWorkspaceTagsParams(
    params?: WorkspaceTagsQueryParams
) {
    return {
        includeCount:
            params?.includeCount ?? defaultParams.includeCount ?? false,
        sortBy: params?.sortBy ?? defaultParams.sortBy,
        order: params?.order ?? defaultParams.order,
    } as Required<WorkspaceTagsQueryParams>;
}

export const workspaceTagsQueryKey = (
    params?: WorkspaceTagsQueryParams
) => {
    const normalized = normalizeWorkspaceTagsParams(params);
    return [
        'workspace',
        'tags',
        normalized.includeCount ? 'with-count' : 'basic',
        normalized.sortBy,
        normalized.order,
    ] as const;
};

export const WORKSPACE_TAGS_MANAGEMENT_PARAMS = Object.freeze({
    includeCount: true,
    sortBy: 'documentCount',
    order: 'desc',
}) satisfies WorkspaceTagsQueryParams;

export const DOCUMENTS_PAGE_TAGS_PARAMS = Object.freeze({
    includeCount: true,
    sortBy: 'documentCount',
    order: 'desc',
}) satisfies WorkspaceTagsQueryParams;

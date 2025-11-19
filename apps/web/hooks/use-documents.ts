'use client';

import {
    useQuery,
    type UseQueryOptions,
    useInfiniteQuery,
} from '@tanstack/react-query';
import type {
    GetDocumentDetailsResponseType,
    GetDocumentListResponseType,
    GetDocumentTagsResponseType,
} from '@search-hub/schemas';
import {
    normalizeWorkspaceTagsParams,
    workspaceTagsQueryKey,
    type WorkspaceTagsQueryParams,
} from '@/queries/tags';

export type ApiTag = {
    id: string;
    name: string;
    color?: string | null;
    description?: string | null;
    documentCount?: number | null;
};

type DocumentDetails = GetDocumentDetailsResponseType['document'];
type DocumentsCursorResult = GetDocumentListResponseType['documents'];

const defaultFetchInit: RequestInit = {
    credentials: 'include',
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...defaultFetchInit,
        ...init,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Request failed');
    }

    return (await response.json()) as T;
}

export function useDocumentQuery<TData = DocumentDetails>(
    documentId: string,
    options?: Omit<
        UseQueryOptions<
            GetDocumentDetailsResponseType,
            Error,
            TData,
            ['document', string]
        >,
        'queryKey' | 'queryFn'
    >
) {
    return useQuery({
        queryKey: ['document', documentId],
        queryFn: () =>
            fetchJson<GetDocumentDetailsResponseType>(
                `/api/documents/${documentId}`
            ),
        select: (data) => data.document as TData,
        enabled: Boolean(documentId),
        ...options,
    });
}

type InfiniteDocumentsOptions = {
    favoritesOnly?: boolean;
    tenantId?: string;
    limit?: number;
    enabled?: boolean;
};

export function useInfiniteDocumentsQuery({
    favoritesOnly = false,
    tenantId,
    limit = 20,
    enabled = true,
}: InfiniteDocumentsOptions = {}) {
    const keyTenant = tenantId ?? 'global';
    const shouldEnable = enabled && (tenantId ? Boolean(tenantId) : true);

    return useInfiniteQuery({
        queryKey: ['documents', { tenantId: keyTenant, favoritesOnly, limit }],
        enabled: shouldEnable,
        initialPageParam: undefined as string | undefined,
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams();
            params.set('limit', String(limit));
            if (favoritesOnly) params.set('favoritesOnly', 'true');
            if (pageParam) params.set('cursor', pageParam);

            const result = await fetchJson<GetDocumentListResponseType>(
                `/api/documents?${params.toString()}`
            );
            return result.documents;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });
}

export function useDocumentTagsQuery(documentId: string) {
    return useQuery({
        queryKey: ['document', documentId, 'tags'],
        queryFn: () =>
            fetchJson<GetDocumentTagsResponseType>(
                `/api/documents/${documentId}/tags`
            ),
        select: (data) => data.tags as ApiTag[],
        enabled: Boolean(documentId),
    });
}

type WorkspaceTagsResponse = {
    tags: ApiTag[];
    total?: number;
};

type WorkspaceTagsQueryOptions = Partial<WorkspaceTagsQueryParams> & {
    enabled?: boolean;
};

export function useWorkspaceTagsQuery(options: WorkspaceTagsQueryOptions = {}) {
    const { enabled = true, ...params } = options;
    const hasCustomParams =
        params.includeCount !== undefined ||
        params.sortBy !== undefined ||
        params.order !== undefined;
    const normalizedParams = normalizeWorkspaceTagsParams(
        hasCustomParams
            ? {
                  includeCount: params.includeCount ?? false,
                  sortBy: params.sortBy ?? 'name',
                  order: params.order ?? 'asc',
              }
            : undefined
    );
    const searchParams = new URLSearchParams();

    if (normalizedParams.includeCount) {
        searchParams.set('includeCount', 'true');
    }
    if (normalizedParams.sortBy) {
        searchParams.set('sortBy', normalizedParams.sortBy);
    }
    if (normalizedParams.order) {
        searchParams.set('order', normalizedParams.order);
    }

    const queryString = searchParams.toString();

    return useQuery({
        queryKey: workspaceTagsQueryKey(normalizedParams),
        queryFn: () =>
            fetchJson<WorkspaceTagsResponse>(
                `/api/tags${queryString ? `?${queryString}` : ''}`
            ),
        select: (data) => data.tags,
        enabled,
        staleTime: 1000 * 60,
    });
}

type UseDocumentsListOptions = {
    favoritesOnly?: boolean;
    limit?: number;
    enabled?: boolean;
    tenantId?: string;
};

export function useDocumentsListQuery({
    favoritesOnly = false,
    limit = 20,
    enabled = true,
    tenantId,
}: UseDocumentsListOptions = {}) {
    const tenantScopedKey = tenantId ?? 'global';
    const shouldEnable =
        enabled && (tenantId === undefined ? true : Boolean(tenantId));

    return useQuery({
        queryKey: [
            'documents',
            { tenantId: tenantScopedKey, favoritesOnly, limit },
        ],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set('limit', String(limit));
            if (favoritesOnly) {
                params.set('favoritesOnly', 'true');
            }

            return fetchJson<GetDocumentListResponseType>(
                `/api/documents?${params.toString()}`
            );
        },
        select: (data) => data.documents as DocumentsCursorResult,
        enabled: shouldEnable,
    });
}

type ReminderStatus = 'scheduled' | 'notified' | 'done';

export type DocumentReminder = {
    id: string;
    reminderId?: string;
    status: ReminderStatus;
    whenISO?: string;
    whenText?: string;
};

type DocumentRemindersResponse = {
    reminders: DocumentReminder[];
};

export function useDocumentRemindersQuery(
    documentId: string,
    options?: { refetchInterval?: number }
) {
    return useQuery({
        queryKey: ['document', documentId, 'reminders'],
        queryFn: () =>
            fetchJson<DocumentRemindersResponse>(
                `/api/reminders/document/${documentId}`
            ),
        select: (data) => data.reminders,
        enabled: Boolean(documentId),
        refetchInterval: options?.refetchInterval,
    });
}

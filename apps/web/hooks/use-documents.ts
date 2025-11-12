'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type {
    GetDocumentDetailsResponseType,
    GetDocumentListResponseType,
    GetDocumentTagsResponseType,
} from '@search-hub/schemas';

export type ApiTag = {
    id: string;
    name: string;
    color?: string | null;
    description?: string | null;
};

type DocumentDetails = GetDocumentDetailsResponseType['document'];
type DocumentsList = GetDocumentListResponseType['documents'];

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
};

export function useWorkspaceTagsQuery(enabled = true) {
    return useQuery({
        queryKey: ['workspace', 'tags'],
        queryFn: () => fetchJson<WorkspaceTagsResponse>('/api/tags'),
        select: (data) => data.tags,
        enabled,
        staleTime: 1000 * 60,
    });
}

type UseDocumentsListOptions = {
    favoritesOnly?: boolean;
    limit?: number;
    offset?: number;
    enabled?: boolean;
};

export function useDocumentsListQuery({
    favoritesOnly = false,
    limit = 10,
    offset = 0,
    enabled = true,
}: UseDocumentsListOptions = {}) {
    return useQuery({
        queryKey: ['documents', { favoritesOnly, limit, offset }],
        queryFn: () => {
            const params = new URLSearchParams();
            params.set('limit', String(limit));
            params.set('offset', String(offset));
            if (favoritesOnly) {
                params.set('favoritesOnly', 'true');
            }

            return fetchJson<GetDocumentListResponseType>(
                `/api/documents?${params.toString()}`
            );
        },
        select: (data) => data.documents as DocumentsList,
        enabled,
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

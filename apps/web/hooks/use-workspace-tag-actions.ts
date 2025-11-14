'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import type { ApiTag } from '@/hooks/use-documents';
import {
    WORKSPACE_TAGS_MANAGEMENT_PARAMS,
    workspaceTagsQueryKey,
} from '@/queries/tags';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'content-type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Request failed');
    }

    if (response.status === 204) {
        return {} as T;
    }

    return (await response.json()) as T;
}

const TAGS_QUERY_KEY = workspaceTagsQueryKey(
    WORKSPACE_TAGS_MANAGEMENT_PARAMS
);

type WorkspaceTagsCache = {
    tags?: ApiTag[];
};

interface UpdateTagPayload {
    id: string;
    name?: string | null;
    color?: string | null;
    description?: string | null;
}

interface CreateTagPayload {
    name: string;
    color?: string | null;
    description?: string | null;
}

export function useWorkspaceTagActions() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const updateCacheTag = (updatedTag: ApiTag) => {
        queryClient.setQueryData<WorkspaceTagsCache | undefined>(
            TAGS_QUERY_KEY,
            (prev) => {
                if (!prev?.tags) return prev;
                return {
                    ...prev,
                    tags: prev.tags.map((tag) =>
                        tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag
                    ),
                };
            }
        );
    };

    const removeCacheTag = (id: string) => {
        queryClient.setQueryData<WorkspaceTagsCache | undefined>(
            TAGS_QUERY_KEY,
            (prev) => {
                if (!prev?.tags) return prev;
                return {
                    ...prev,
                    tags: prev.tags.filter((tag) => tag.id !== id),
                };
            }
        );
    };

    const addCacheTag = (newTag: ApiTag) => {
        queryClient.setQueryData<WorkspaceTagsCache | undefined>(
            TAGS_QUERY_KEY,
            (prev) => {
                if (!prev?.tags) {
                    return { tags: [newTag] };
                }
                return { ...prev, tags: [newTag, ...prev.tags] };
            }
        );
    };

    const createMutation = useMutation<{ tag: ApiTag }, Error, CreateTagPayload>
    ({
        mutationFn: (payload) =>
            jsonFetch('/api/tags', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        onSuccess: (data) => {
            if (data?.tag) {
                addCacheTag(data.tag);
            }
            toast.success('Tag created');
        },
        onError: (error: Error) => {
            toast.error('Failed to create tag', {
                description: error.message,
            });
        },
    });

    const updateMutation = useMutation<
        { tag: ApiTag },
        Error,
        UpdateTagPayload
    >({
        mutationFn: ({ id, ...payload }) =>
            jsonFetch(`/api/tags/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            }),
        onSuccess: (data) => {
            if (data?.tag) {
                updateCacheTag(data.tag);
            }
            toast.success('Tag updated');
        },
        onError: (error: Error) => {
            toast.error('Failed to update tag', {
                description: error.message,
            });
        },
    });

    const deleteMutation = useMutation<void, Error, string>({
        mutationFn: (id: string) =>
            jsonFetch(`/api/tags/${id}`, {
                method: 'DELETE',
            }),
        onSuccess: (_data, id) => {
            removeCacheTag(id);
            toast.success('Tag deleted');
        },
        onError: (error: Error) => {
            toast.error('Failed to delete tag', {
                description: error.message,
            });
        },
    });

    return {
        createTag: createMutation.mutateAsync,
        updateTag: updateMutation.mutateAsync,
        deleteTag: deleteMutation.mutateAsync,
        createPending: createMutation.isPending,
        updatePending: updateMutation.isPending,
        deletePending: deleteMutation.isPending,
    };
}

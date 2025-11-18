'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import {
    useMutation,
    useQueryClient,
    type QueryKey,
} from '@tanstack/react-query';
import type {
    CreateDocumentRequestType,
    CreateDocumentResponseType,
    CreateTagResponseType,
    GetDocumentListResponseType,
    GetDocumentTagsResponseType,
    GetDocumentDetailsResponseType,
} from '@search-hub/schemas';
import type { TagOption } from '@/components/ui/tag';

type RenamePayload = { documentId: string; title: string };
type DeletePayload = { documentId: string; title?: string };
type FavoritePayload = { documentId: string; makeFavorite: boolean };
type AddTagPayload = { documentId: string; tag: TagOption };
type RemoveTagPayload = { documentId: string; tagId: string };
type CreateDocumentPayload = CreateDocumentRequestType;
type CreateTagPayload = {
    name: string;
    color?: string;
    description?: string;
};

async function jsonFetch<T>(
    url: string,
    init?: RequestInit & { body?: string }
): Promise<T> {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return (await response.json()) as T;
}

export function useDocumentActions() {
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const invalidateDocument = (
        documentId: string,
        extraKeys: QueryKey[] = []
    ) => {
        queryClient.invalidateQueries({ queryKey: ['document', documentId] });
        queryClient.invalidateQueries({
            queryKey: ['document', documentId, 'tags'],
        });
        extraKeys.forEach((key) =>
            queryClient.invalidateQueries({ queryKey: key })
        );
    };

    const DEFAULT_DOCUMENT_METADATA: CreateDocumentRequestType['metadata'] = {
        iconEmoji: '📄',
    };

    const createDocumentMutation = useMutation<
        CreateDocumentResponseType,
        Error,
        CreateDocumentPayload | undefined
    >({
        mutationFn: (payload) => {
            const body: CreateDocumentRequestType = {
                title: payload?.title ?? 'Untitled page',
                content: payload?.content ?? '',
                source: payload?.source ?? 'editor',
                metadata: payload?.metadata ?? DEFAULT_DOCUMENT_METADATA,
            };

            if (payload?.sourceUrl !== undefined) {
                body.sourceUrl = payload.sourceUrl;
            }

            return jsonFetch('/api/documents', {
                method: 'POST',
                body: JSON.stringify(body),
            });
        },
        onSuccess: (document) => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            router.push(`/doc/${document.id}`);
        },
        onError: (error) => {
            toast.error('Unable to create document', {
                description: error.message,
            });
        },
    });

    const triggerDocumentCreate = (payload?: CreateDocumentPayload) =>
        createDocumentMutation.mutateAsync(payload);

    const renameMutation = useMutation<
        unknown,
        Error,
        RenamePayload,
        {
            previousDetail?: GetDocumentDetailsResponseType;
            previousLists: Array<
                [QueryKey, GetDocumentListResponseType | undefined]
            >;
        }
    >({
        mutationFn: ({ documentId, title }) =>
            jsonFetch(`/api/documents/${documentId}/title`, {
                method: 'PATCH',
                body: JSON.stringify({ title }),
            }),
        onMutate: async ({ documentId, title }) => {
            await queryClient.cancelQueries({
                queryKey: ['document', documentId],
            });

            const previousDetail =
                queryClient.getQueryData<GetDocumentDetailsResponseType>([
                    'document',
                    documentId,
                ]);

            if (previousDetail?.document) {
                queryClient.setQueryData(['document', documentId], {
                    ...previousDetail,
                    document: { ...previousDetail.document, title },
                });
            }

            const listQueries =
                queryClient.getQueriesData<GetDocumentListResponseType>({
                    queryKey: ['documents'],
                }) ?? [];

            listQueries.forEach(([key, data]) => {
                if (!data?.documents?.items) return;
                const nextItems = data.documents.items.map((doc) =>
                    doc.id === documentId ? { ...doc, title } : doc
                );
                queryClient.setQueryData(key, {
                    ...data,
                    documents: { ...data.documents, items: nextItems },
                });
            });

            return { previousDetail, previousLists: listQueries };
        },
        onSuccess: (_data, { documentId }) => {
            invalidateDocument(documentId, [['documents']]);
            toast.success('Document renamed');
        },
        onError: (error, { documentId }, context) => {
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    ['document', documentId],
                    context.previousDetail
                );
            }
            context?.previousLists.forEach(([key, data]) => {
                if (data) queryClient.setQueryData(key, data);
            });
            toast.error('Unable to rename document', {
                description: error.message,
            });
        },
    });

    const deleteMutation = useMutation<unknown, Error, DeletePayload>({
        mutationFn: ({ documentId }) =>
            jsonFetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
            }),
        onSuccess: async (_data, { documentId, title }) => {
            invalidateDocument(documentId, [['documents'], ['favorites']]);
            toast.success('Document deleted', {
                description: title
                    ? `"${title}" has been permanently removed.`
                    : 'The document has been permanently deleted.',
            });

            if (
                typeof window !== 'undefined' &&
                pathname?.includes(documentId)
            ) {
                try {
                    const data =
                        await queryClient.fetchQuery<GetDocumentListResponseType>(
                            {
                                queryKey: [
                                    'documents',
                                    {
                                        favoritesOnly: false,
                                        limit: 1,
                                        offset: 0,
                                    },
                                ],
                                queryFn: () =>
                                    jsonFetch('/api/documents?limit=1&offset=0', {
                                        method: 'GET',
                                    }),
                            }
                        );
                    const nextDoc = data?.documents?.items?.[0];
                    if (nextDoc) {
                        router.push(`/doc/${nextDoc.id}`);
                    } else {
                        try {
                            await triggerDocumentCreate();
                        } catch {
                            // Errors handled inside triggerDocumentCreate
                        }
                    }
                } catch {
                    try {
                        await triggerDocumentCreate();
                    } catch {
                        // Errors handled inside triggerDocumentCreate
                    }
                }
            }
        },
        onError: (error) => {
            toast.error('Failed to delete document', {
                description: error.message,
            });
        },
    });

    const favoriteMutation = useMutation<
        unknown,
        Error,
        FavoritePayload,
        {
            previousDetail?: GetDocumentDetailsResponseType;
            previousLists: Array<
                [QueryKey, GetDocumentListResponseType | undefined]
            >;
        }
    >({
        mutationFn: ({ documentId, makeFavorite }) =>
            jsonFetch(
                `/api/documents/${documentId}/${
                    makeFavorite ? 'favorite' : 'unfavorite'
                }`,
                {
                    method: 'POST',
                }
            ),
        onMutate: async ({ documentId, makeFavorite }) => {
            await queryClient.cancelQueries({
                queryKey: ['document', documentId],
            });

            const previousDetail =
                queryClient.getQueryData<GetDocumentDetailsResponseType>([
                    'document',
                    documentId,
                ]);

            if (previousDetail?.document) {
                queryClient.setQueryData(['document', documentId], {
                    ...previousDetail,
                    document: {
                        ...previousDetail.document,
                        isFavorite: makeFavorite,
                    },
                });
            }

            const listQueries =
                queryClient.getQueriesData<GetDocumentListResponseType>({
                    queryKey: ['documents'],
                }) ?? [];

            listQueries.forEach(([key, data]) => {
                if (!data?.documents?.items) return;
                const nextItems = data.documents.items.map((doc) =>
                    doc.id === documentId
                        ? { ...doc, isFavorite: makeFavorite }
                        : doc
                );
                queryClient.setQueryData(key, {
                    ...data,
                    documents: { ...data.documents, items: nextItems },
                });
            });

            return { previousDetail, previousLists: listQueries };
        },
        onSuccess: (_data, { documentId, makeFavorite }) => {
            invalidateDocument(documentId, [['documents'], ['favorites']]);
            toast.success(
                makeFavorite
                    ? 'Document added to favorites'
                    : 'Removed from favorites'
            );
        },
        onError: (error, { documentId }, context) => {
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    ['document', documentId],
                    context.previousDetail
                );
            }
            context?.previousLists.forEach(([key, data]) => {
                if (data) {
                    queryClient.setQueryData(key, data);
                }
            });
            toast.error('Unable to update favorite', {
                description: error.message,
            });
        },
    });

    const addTagMutation = useMutation<
        unknown,
        Error,
        AddTagPayload,
        { previous: GetDocumentTagsResponseType | undefined }
    >({
        mutationFn: ({ documentId, tag }) =>
            jsonFetch(`/api/documents/${documentId}/tags`, {
                method: 'POST',
                body: JSON.stringify({ tagIds: [tag.id] }),
            }),
        onMutate: async ({ documentId, tag }) => {
            await queryClient.cancelQueries({
                queryKey: ['document', documentId, 'tags'],
            });
            const previous =
                queryClient.getQueryData<GetDocumentTagsResponseType>([
                    'document',
                    documentId,
                    'tags',
                ]);
            const currentTags = previous?.tags ?? [];
            const nextTags = currentTags.some(
                (existing) => existing.id === tag.id
            )
                ? currentTags
                : [
                      ...currentTags,
                      {
                          id: tag.id,
                          name: tag.name,
                          color: tag.color ?? null,
                          description: tag.description ?? null,
                      },
                  ];
            queryClient.setQueryData<GetDocumentTagsResponseType>(
                ['document', documentId, 'tags'],
                { tags: nextTags }
            );
            return { previous };
        },
        onError: (error, variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    ['document', variables.documentId, 'tags'],
                    context.previous
                );
            }
            toast.error('Unable to add tag', {
                description: error.message,
            });
        },
        onSuccess: (_data, { documentId }) => {
            invalidateDocument(documentId, [['workspace', 'tags']]);
            toast.success('Tag added to document');
        },
    });

    const removeTagMutation = useMutation<
        unknown,
        Error,
        RemoveTagPayload,
        { previous: GetDocumentTagsResponseType | undefined }
    >({
        mutationFn: ({ documentId, tagId }) =>
            jsonFetch(`/api/documents/${documentId}/tags/${tagId}`, {
                method: 'DELETE',
            }),
        onMutate: async ({ documentId, tagId }) => {
            await queryClient.cancelQueries({
                queryKey: ['document', documentId, 'tags'],
            });
            const previous =
                queryClient.getQueryData<GetDocumentTagsResponseType>([
                    'document',
                    documentId,
                    'tags',
                ]);
            const currentTags = previous?.tags ?? [];
            const nextTags = currentTags.filter((tag) => tag.id !== tagId);
            queryClient.setQueryData<GetDocumentTagsResponseType>(
                ['document', documentId, 'tags'],
                { tags: nextTags }
            );
            return { previous };
        },
        onError: (error, variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    ['document', variables.documentId, 'tags'],
                    context.previous
                );
            }
            toast.error('Unable to remove tag', {
                description: error.message,
            });
        },
        onSuccess: (_data, { documentId }) => {
            invalidateDocument(documentId);
            toast.success('Tag removed from document');
        },
    });

    const createTagMutation = useMutation<
        CreateTagResponseType,
        Error,
        CreateTagPayload
    >({
        mutationFn: (payload) =>
            jsonFetch('/api/tags', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', 'tags'] });
            toast.success('Tag created');
        },
        onError: (error) => {
            toast.error('Unable to create tag', {
                description: error.message,
            });
        },
    });

    return {
        renameDocument: (documentId: string, title: string) =>
            renameMutation.mutateAsync({ documentId, title }),
        renamePending: renameMutation.isPending,
        deleteDocument: (documentId: string, title?: string) =>
            deleteMutation.mutateAsync({ documentId, title }),
        createDocument: (payload?: CreateDocumentPayload) =>
            triggerDocumentCreate(payload),
        createDocumentPending: createDocumentMutation.isPending,
        toggleFavorite: (documentId: string, makeFavorite: boolean) =>
            favoriteMutation.mutateAsync({ documentId, makeFavorite }),
        addTagToDocument: (documentId: string, tag: TagOption) =>
            addTagMutation.mutateAsync({ documentId, tag }),
        removeTagFromDocument: (documentId: string, tagId: string) =>
            removeTagMutation.mutateAsync({ documentId, tagId }),
        createTag: (payload: CreateTagPayload) =>
            createTagMutation.mutateAsync(payload),
        addTagPending: addTagMutation.isPending,
        removeTagPending: removeTagMutation.isPending,
        createTagPending: createTagMutation.isPending,
        editDocumentTags: (documentId: string) =>
            router.push(`/doc/${documentId}`),
    };
}

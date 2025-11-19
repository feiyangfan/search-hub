import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from '@tanstack/react-query';
import type { ListTagsResponseType } from '@search-hub/schemas';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
    DOCUMENTS_PAGE_TAGS_PARAMS,
    workspaceTagsQueryKey,
} from '@/queries/tags';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export default async function DocumentsLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const apiSessionCookie = (session as { apiSessionCookie?: string })
        ?.apiSessionCookie;
    const queryClient = new QueryClient();

    if (apiSessionCookie) {
        const searchParams = new URLSearchParams();
        if (DOCUMENTS_PAGE_TAGS_PARAMS.includeCount) {
            searchParams.set('includeCount', 'true');
        }
        if (DOCUMENTS_PAGE_TAGS_PARAMS.sortBy) {
            searchParams.set('sortBy', DOCUMENTS_PAGE_TAGS_PARAMS.sortBy);
        }
        if (DOCUMENTS_PAGE_TAGS_PARAMS.order) {
            searchParams.set('order', DOCUMENTS_PAGE_TAGS_PARAMS.order);
        }
        const url = `${apiBase}/v1/tags${
            searchParams.size ? `?${searchParams.toString()}` : ''
        }`;
        try {
            const res = await fetch(url, {
                headers: { cookie: apiSessionCookie },
            });
            if (!res.ok) {
                throw new Error(`Failed to preload tags: ${res.status}`);
            }
            const tagsResponse = (await res.json()) as ListTagsResponseType;
            queryClient.setQueryData(
                workspaceTagsQueryKey(DOCUMENTS_PAGE_TAGS_PARAMS),
                tagsResponse
            );
        } catch (error) {
            console.error('Failed to preload document tags', error);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="flex flex-1 flex-col overflow-hidden">
                {children}
            </div>
        </HydrationBoundary>
    );
}

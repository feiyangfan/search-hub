import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
    type InfiniteData,
} from '@tanstack/react-query';
import type {
    ListTagsResponseType,
    GetDocumentListResponseType,
} from '@search-hub/schemas';
import { SearchHubClient } from '@search-hub/sdk';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
    DOCUMENTS_PAGE_TAGS_PARAMS,
    workspaceTagsQueryKey,
} from '@/queries/tags';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';
const DOCUMENTS_PAGE_SIZE = 20;

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
        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        try {
            const tagsResponse = await client.getTags(
                DOCUMENTS_PAGE_TAGS_PARAMS
            );
            queryClient.setQueryData(
                workspaceTagsQueryKey(DOCUMENTS_PAGE_TAGS_PARAMS),
                tagsResponse
            );
        } catch (error) {
            console.error('Failed to preload document tags', error);
        }

        try {
            const documentsData = await client.listDocuments({
                limit: DOCUMENTS_PAGE_SIZE,
            });
            const initialData: InfiniteData<
                GetDocumentListResponseType['documents'],
                string | undefined
            > = {
                pages: [documentsData.documents],
                pageParams: [undefined],
            };
            queryClient.setQueryData(
                [
                    'documents',
                    {
                        tenantId: 'global',
                        favoritesOnly: false,
                        limit: DOCUMENTS_PAGE_SIZE,
                    },
                ],
                initialData
            );
        } catch (error) {
            console.error('Failed to preload documents list', error);
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

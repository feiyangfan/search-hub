import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from '@tanstack/react-query';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DocumentHeaderHydrator } from '@/components/document/document-header-hydrator';
import type { DocumentHeaderData } from '@/components/document/document-header-context';
import { DEFAULT_TAG_COLOR, type TagOption } from '@/components/ui/tag';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export default async function DocumentLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/sign-in');
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        redirect('/auth/sign-in');
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    const queryClient = new QueryClient();
    let headerData: DocumentHeaderData | null = null;

    try {
        const { id } = await params;

        const [documentResponse, documentTagsResponse] = await Promise.all([
            client.getDocumentDetails(id),
            client.getDocumentTags(id),
        ]);

        queryClient.setQueryData(['document', id], documentResponse);
        queryClient.setQueryData(
            ['document', id, 'tags'],
            documentTagsResponse
        );

        const document = documentResponse.document;

        const documentTitle =
            document?.title?.trim()?.length > 0
                ? document.title
                : 'Untitled document';

        const tagOptions: TagOption[] =
            (documentTagsResponse?.tags ?? []).map((tag) => ({
                id: tag.id,
                name: tag.name,
                color: tag.color ?? DEFAULT_TAG_COLOR,
            })) ?? [];

        headerData = {
            documentId: id,
            title: documentTitle,
            isFavorited: Boolean(document?.isFavorite),
            tags: tagOptions,
            updatedAt: document?.updatedAt ?? null,
        };
    } catch (error) {
        console.error('Failed to preload document header data', error);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <DocumentHeaderHydrator data={headerData} />
            {children}
        </HydrationBoundary>
    );
}

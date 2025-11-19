import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from '@tanstack/react-query';
import type { ListTagsResponseType } from '@search-hub/schemas';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
    WORKSPACE_TAGS_MANAGEMENT_PARAMS,
    workspaceTagsQueryKey,
} from '@/queries/tags';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export default async function WorkspaceManagementLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/sign-in');
    }

    const memberships = session.user?.memberships ?? [];
    const activeTenantId =
        session.activeTenantId ?? memberships[0]?.tenantId ?? null;
    const activeRole = memberships.find(
        (membership) => membership.tenantId === activeTenantId
    )?.role;
    const normalizedRole = activeRole?.toLowerCase();

    if (normalizedRole !== 'owner' && normalizedRole !== 'admin') {
        redirect('/dashboard');
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    const queryClient = new QueryClient();

    if (apiSessionCookie) {
        const searchParams = new URLSearchParams();
        if (WORKSPACE_TAGS_MANAGEMENT_PARAMS.includeCount) {
            searchParams.set('includeCount', 'true');
        }
        if (WORKSPACE_TAGS_MANAGEMENT_PARAMS.sortBy) {
            searchParams.set('sortBy', WORKSPACE_TAGS_MANAGEMENT_PARAMS.sortBy);
        }
        if (WORKSPACE_TAGS_MANAGEMENT_PARAMS.order) {
            searchParams.set('order', WORKSPACE_TAGS_MANAGEMENT_PARAMS.order);
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
                workspaceTagsQueryKey(WORKSPACE_TAGS_MANAGEMENT_PARAMS),
                tagsResponse
            );
        } catch (error) {
            console.error('Failed to preload workspace tags', error);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
        </HydrationBoundary>
    );
}

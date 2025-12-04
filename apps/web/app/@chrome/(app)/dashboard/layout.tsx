import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from '@tanstack/react-query';
import { SearchHubClient } from '@search-hub/sdk';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { workspaceOverviewQueryKey } from '@/queries/workspace';
import { pendingRemindersQueryKey } from '@/queries/reminders';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export default async function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/sign-in');
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    const memberships = session.user?.memberships ?? [];
    const activeTenantId =
        session.activeTenantId ?? memberships[0]?.tenantId ?? null;
    const queryClient = new QueryClient();

    if (apiSessionCookie && activeTenantId) {
        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        try {
            const workspaceStats = await client.getTenantStats(activeTenantId);
            queryClient.setQueryData(
                workspaceOverviewQueryKey(activeTenantId),
                workspaceStats
            );
        } catch (error) {
            console.error('Failed to preload workspace overview data', error);
        }

        try {
            const pendingReminders = await client.getPendingReminders();
            queryClient.setQueryData(
                pendingRemindersQueryKey(activeTenantId),
                pendingReminders
            );
        } catch (error) {
            console.error('Failed to preload reminders data', error);
        }

        try {
            const indexingStatus = await client.getIndexingStatus({
                includeRecentJobs: true,
                jobLimit: 5,
            });
            queryClient.setQueryData(
                ['admin', 'indexing', activeTenantId],
                indexingStatus
            );
        } catch (error) {
            console.error('Failed to preload indexing status', error);
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

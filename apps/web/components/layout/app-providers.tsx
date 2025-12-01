'use client';

import { useState, type PropsWithChildren } from 'react';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import {
    QueryClient,
    QueryClientProvider,
    HydrationBoundary,
    type DehydratedState,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { SessionGuard } from '../auth/session-guard';
import { SearchProvider } from '../search/search-provider';

type AppProvidersProps = PropsWithChildren<{
    session: Session | null;
    dehydratedState?: DehydratedState;
}>;

export function AppProviders({
    session,
    dehydratedState,
    children,
}: AppProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 30,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <SessionProvider session={session}>
            <SessionGuard />
            <QueryClientProvider client={queryClient}>
                <SearchProvider>
                    <HydrationBoundary state={dehydratedState}>
                        {children}
                    </HydrationBoundary>
                    {process.env.NODE_ENV === 'development' ? (
                        <ReactQueryDevtools initialIsOpen={false} />
                    ) : null}
                </SearchProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}

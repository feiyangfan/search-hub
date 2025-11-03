'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { PropsWithChildren } from 'react';

type AppProvidersProps = PropsWithChildren<{
    session: Session | null;
}>;

export function AppProviders({ session, children }: AppProvidersProps) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
}

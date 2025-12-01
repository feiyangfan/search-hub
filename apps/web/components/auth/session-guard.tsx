'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * SessionGuard detects when the backend session has expired
 * and forces the user to re-authenticate
 */
export function SessionGuard() {
    const { data: session, status } = useSession();

    useEffect(() => {
        // If session has an error flag indicating backend session expired
        if (
            status === 'authenticated' &&
            session?.error === 'BackendSessionExpired'
        ) {
            console.log(
                'Backend session expired, forcing sign out and redirect to sign-in'
            );
            // Force sign out and redirect to sign-in page
            signOut({ callbackUrl: '/auth/sign-in' });
        }
    }, [session, status]);

    // This component doesn't render anything
    return null;
}

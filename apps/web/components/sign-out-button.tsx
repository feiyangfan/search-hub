'use client';
import { signOut } from 'next-auth/react';
import { Button } from './ui/button';

import { toast } from 'sonner';

export function SignOutButton() {
    async function handleClick() {
        const res = await fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) {
            return toast('Could not sign out. Please try again');
        }
        await signOut({ callbackUrl: '/' });
    }
    return <Button onClick={() => handleClick()}>Sign out</Button>;
}

'use client';
import { signOut } from 'next-auth/react';
import { Button } from './ui/button';

export function SignOutButton() {
    async function handleClick() {
        await fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
        });
        await signOut({ callbackUrl: '/' });
    }
    return <Button onClick={() => handleClick()}>Sign out</Button>;
}

'use client';

import { signIn } from 'next-auth/react';
import type { ClientSafeProvider } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignInButtons({
    providers,
}: {
    providers: Record<string, ClientSafeProvider>;
}) {
    return (
        <div className="space-y-3">
            {Object.values(providers).map((provider) => (
                <Button
                    className="w-full"
                    variant={'outline'}
                    key={provider.id}
                    onClick={() =>
                        signIn(provider.id, { callbackUrl: '/dashboard' })
                    }
                >
                    Continue with {provider.name}
                </Button>
            ))}
        </div>
    );
}

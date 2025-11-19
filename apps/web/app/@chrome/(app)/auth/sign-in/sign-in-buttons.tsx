'use client';

import { signIn } from 'next-auth/react';
import type { ClientSafeProvider } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function SignInButtons({
    providers,
}: {
    providers: Record<string, ClientSafeProvider>;
}) {
    const filteredProviders = Object.values(providers).filter(
        (provider) => provider.id !== 'credentials'
    );

    if (filteredProviders.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {filteredProviders.map((provider) =>
                provider.id === 'google' ? (
                    <div
                        key={provider.id}
                        className="flex w-full cursor-pointer items-center justify-center rounded-md border border-transparent"
                    >
                        <Image
                            src="/web_light_rd_ctn.svg"
                            alt="Sign in with Google"
                            width={200}
                            height={40}
                            onClick={() =>
                                signIn(provider.id, {
                                    callbackUrl: '/dashboard',
                                })
                            }
                        />
                    </div>
                ) : (
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
                )
            )}
        </div>
    );
}

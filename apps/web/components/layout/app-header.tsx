'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavActions } from '@/components/navigation/nav-action';

interface AppHeaderProps {
    session: Session | null;
    showSidebarTrigger?: boolean;
}

export function AppHeader({
    session,
    showSidebarTrigger = true,
}: AppHeaderProps) {
    const user = session?.user;

    return (
        <header className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="mx-auto flex h-12 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    {user && showSidebarTrigger ? (
                        <SidebarTrigger className="-ml-2" />
                    ) : null}
                    <Link
                        href={user ? '/dashboard' : '/'}
                        className="font-semibold"
                    >
                        Search Hub
                    </Link>
                </div>
                {/* <nav className="flex items-center gap-3 text-sm pr-4">
                    {session ? (
                        <NavActions />
                    ) : (
                        <Button asChild size="sm">
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    )}
                </nav> */}
            </div>

            <Separator />
        </header>
    );
}

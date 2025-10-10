import Link from 'next/link';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getServerSession } from 'next-auth';
import { SignOutButton } from './sign-out-button';

function getInitials(input?: string | null) {
    if (!input) {
        return 'U';
    }
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0]!.slice(0, 2).toUpperCase();
    }
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
}

export async function AppHeader() {
    const session = await getServerSession(authOptions);
    console.log('header ses', session);
    const user = session?.user;
    const initials = getInitials(user?.name ?? user?.email ?? undefined);

    return (
        <div className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="mx-auto flex h-14 items-center justify-between px-4">
                <Link href="/" className="font-semibold">
                    Search Hub
                </Link>
                <nav className="flex items-center gap-3 text-sm">
                    {session ? (
                        <Link
                            href="/dashboard"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                            aria-label="Go to dashboard"
                        >
                            {initials}
                        </Link>
                    ) : (
                        <Button asChild size="sm">
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    )}
                    {session ? <SignOutButton /> : ''}
                </nav>
            </div>
            <Separator />
        </div>
    );
}

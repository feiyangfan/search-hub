import Link from 'next/link';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserProfileIcon } from './user-profile-icon';
import { MenuIcon } from 'lucide-react';
export async function AppHeader() {
    const session = await getServerSession(authOptions);

    const user = session?.user;

    return (
        <div className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="mx-auto flex h-14 items-center justify-between px-4">
                <div className="pl-4">
                    <Button variant="outline" size="icon" aria-label="Submit">
                        <MenuIcon />
                    </Button>
                    <Link
                        href={user ? '/dashboard' : '/'}
                        className="font-semibold pl-4"
                    >
                        Search Hub
                    </Link>
                </div>
                <nav className="flex items-center gap-3 text-sm pr-4">
                    {session ? (
                        <UserProfileIcon user={user} />
                    ) : (
                        <Button asChild size="sm">
                            <Link href="/auth/sign-in">Sign in</Link>
                        </Button>
                    )}
                </nav>
            </div>
            <Separator />
        </div>
    );
}

'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { TeamSwitcher } from './team-switcher';

type UserProfileIconProps = {
    user: Session['user'];
};

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

export function UserProfileIcon({ user }: UserProfileIconProps) {
    const initials = getInitials(user?.name ?? user?.email ?? undefined);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
                <DropdownMenuItem>
                    <TeamSwitcher />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

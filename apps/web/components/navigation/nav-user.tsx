'use client';

import { BadgeCheck, ChevronsUpDown, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { signOut } from 'next-auth/react';

export function NavUser({
    user,
    activeWorkspaceRole,
}: {
    user: {
        name: string | null | undefined;
        email: string | null | undefined;
        image?: string | null | undefined;
    };
    activeWorkspaceRole?: string | null;
}) {
    const { isMobile } = useSidebar();
    const initials = getInitials(user.name ?? user.email ?? undefined);
    const normalizedRole = activeWorkspaceRole?.toLowerCase();
    const canManageWorkspace =
        normalizedRole === 'owner' || normalizedRole === 'admin';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                {user.image ? (
                                    <AvatarImage
                                        src={user.image}
                                        alt={user.name ?? undefined}
                                    />
                                ) : null}
                                <AvatarFallback className="rounded-lg">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {user.name}
                                </span>
                                <span className="truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    {user.image ? (
                                        <AvatarImage
                                            src={user.image}
                                            alt={user.name ?? undefined}
                                        />
                                    ) : null}
                                    <AvatarFallback className="rounded-lg">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {user.name}
                                    </span>
                                    <span className="truncate text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            {canManageWorkspace ? (
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/workspace-management"
                                        className="flex items-center gap-2"
                                    >
                                        <Shield />
                                        Workspace management
                                    </Link>
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function getInitials(input?: string | null) {
    if (!input) return 'U';
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0]!.slice(0, 2).toUpperCase();
    }
    const first = parts[0]?.[0] ?? '';
    const last = parts[parts.length - 1]?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
}

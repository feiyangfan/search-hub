'use client';

import * as React from 'react';
import { Home, Search, Sparkles, FilePlus, File } from 'lucide-react';

import { NavFavorites } from '@/components/navigation/nav-favorites';
import { NavMain } from '@/components/navigation/nav-main';
import { NavDocuments } from '@/components/navigation/nav-documents';
import { WorkspaceSwitcher } from '@/components/navigation/workspace-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar';
import { NavUser } from '../navigation/nav-user';

import type { Session } from 'next-auth';

// This is sample data.
const data = {
    navMain: [
        {
            title: 'Home',
            url: '/dashboard',
            icon: Home,
        },
        {
            title: 'Search',
            url: '#',
            icon: Search,
        },
        {
            title: 'New document',
            url: '/dashboard/documents/new',
            icon: FilePlus,
        },
        {
            title: 'Document Explorer',
            url: '/documents',
            icon: File,
        },
    ],

    favorites: [
        {
            name: 'Project Management & Task Tracking',
            url: '#',
        },
    ],
};

type WorkspaceOption = {
    id?: string;
    name: string;
    logo?: React.ElementType;
    role?: string;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
    user: Session['user'];
    workspaces?: WorkspaceOption[];
    activeTenantId?: string;
};

export function AppSidebar({
    user,
    workspaces,
    activeTenantId,
    ...props
}: AppSidebarProps) {
    const navUser = {
        name: user?.name,
        email: user?.email,
        image: user?.image,
    };
    const workspaceItems = workspaces || [];
    const activeWorkspace =
        workspaceItems.find((workspace) => workspace.id === activeTenantId) ??
        workspaceItems[0];
    const activeWorkspaceRole = activeWorkspace?.role;

    return (
        <Sidebar collapsible="icon" className="border-r-0" {...props}>
            <SidebarHeader>
                <WorkspaceSwitcher
                    workspaces={workspaceItems}
                    activeTenantId={activeTenantId}
                />
                <NavMain items={data.navMain} />
            </SidebarHeader>
            <SidebarContent>
                <NavFavorites activeTenantId={activeTenantId} />
                <NavDocuments activeTenantId={activeTenantId} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser
                    user={navUser}
                    activeWorkspaceRole={activeWorkspaceRole}
                />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

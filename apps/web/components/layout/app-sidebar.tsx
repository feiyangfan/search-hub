'use client';

import * as React from 'react';
import { Group, Home, Search, Sparkles, FilePlus } from 'lucide-react';

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

import { useDocuments } from '@/hooks/use-documents';

import type { Session } from 'next-auth';

// This is sample data.
const defaultWorkspaces = [
    {
        name: 'Example Inc.',
        logo: Group,
        role: 'Owner',
    },
];

const data = {
    navMain: [
        {
            title: 'New document',
            url: '/dashboard/documents/new',
            icon: FilePlus,
        },
        {
            title: 'Search',
            url: '#',
            icon: Search,
        },
        {
            title: 'Ask AI',
            url: '#',
            icon: Sparkles,
        },
        {
            title: 'Home',
            url: '/dashboard',
            icon: Home,
        },
    ],

    favorites: [
        {
            name: 'Project Management & Task Tracking',
            url: '#',
            emoji: '📊',
        },
    ],
    documents: [
        {
            name: 'Personal Life Management',
            emoji: '🏠',
            pages: [],
        },
        {
            name: 'Professional Development',
            emoji: '💼',
            pages: [],
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
    const workspaceItems = workspaces ?? defaultWorkspaces;

    const { status, items } = useDocuments();
    console.log('docs', items);
    const documents = items ?? [];
    const isLoading = status === 'loading';

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
                <NavFavorites favorites={data.favorites} />
                <NavDocuments documents={documents} isLoading={isLoading} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={navUser} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

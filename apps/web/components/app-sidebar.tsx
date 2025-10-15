'use client';

import * as React from 'react';
import { Group, Home, Search, Sparkles } from 'lucide-react';

import { NavFavorites } from '@/components/nav-favorites';
import { NavMain } from '@/components/nav-main';
import { NavDocuments } from '@/components/nav-documents';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';

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
            url: '#',
            icon: Home,
            isActive: true,
        },
    ],

    favorites: [
        {
            name: 'Project Management & Task Tracking',
            url: '#',
            emoji: '📊',
        },
        {
            name: 'Family Recipe Collection & Meal Planning',
            url: '#',
            emoji: '🍳',
        },
    ],
    documents: [
        {
            name: 'Personal Life Management',
            emoji: '🏠',
            pages: [
                {
                    name: 'Daily Journal & Reflection',
                    url: '#',
                    emoji: '📔',
                },
                {
                    name: 'Health & Wellness Tracker',
                    url: '#',
                    emoji: '🍏',
                },
                {
                    name: 'Personal Growth & Learning Goals',
                    url: '#',
                    emoji: '🌟',
                },
            ],
        },
        {
            name: 'Professional Development',
            emoji: '💼',
            pages: [
                {
                    name: 'Career Objectives & Milestones',
                    url: '#',
                    emoji: '🎯',
                },
                {
                    name: 'Skill Acquisition & Training Log',
                    url: '#',
                    emoji: '🧠',
                },
                {
                    name: 'Networking Contacts & Events',
                    url: '#',
                    emoji: '🤝',
                },
            ],
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
};

export function AppSidebar({ user, workspaces, ...props }: AppSidebarProps) {
    const navUser = {
        name: user?.name,
        email: user?.email,
        image: user?.image,
    };
    const workspaceItems = workspaces ?? defaultWorkspaces;

    return (
        <Sidebar collapsible="icon" className="border-r-0" {...props}>
            <SidebarHeader>
                <WorkspaceSwitcher workspaces={workspaceItems} />
                <NavMain items={data.navMain} />
            </SidebarHeader>
            <SidebarContent>
                <NavFavorites favorites={data.favorites} />
                <NavDocuments documents={data.documents} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={navUser} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

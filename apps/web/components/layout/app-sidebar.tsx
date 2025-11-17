'use client';

import * as React from 'react';
import { Home, Search, FilePlus, File, Loader2 } from 'lucide-react';

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
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useDocumentActions } from '@/hooks/use-document-actions';

import type { Session } from 'next-auth';

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
    const { createDocument, createDocumentPending } = useDocumentActions();
    const handleCreateDocument = React.useCallback(async () => {
        try {
            await createDocument();
        } catch {
            // Error toast handled within useDocumentActions
        }
    }, [createDocument]);
    const navItems = React.useMemo(
        () => [
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
                icon: createDocumentPending ? Loader2 : FilePlus,
                iconClassName: createDocumentPending ? 'animate-spin' : undefined,
                action: handleCreateDocument,
                disabled: createDocumentPending,
            },
            {
                title: 'Document Explorer',
                url: '/documents',
                icon: File,
            },
        ],
        [createDocumentPending, handleCreateDocument]
    );
    const workspaceItems = workspaces || [];
    const activeWorkspace =
        workspaceItems.find((workspace) => workspace.id === activeTenantId) ??
        workspaceItems[0];
    const activeWorkspaceRole = activeWorkspace?.role;

    return (
        <Sidebar collapsible="icon" className="border-r-0" {...props}>
            <SidebarHeader>
                <div className="flex items-center justify-between">
                    <WorkspaceSwitcher
                        workspaces={workspaceItems}
                        activeTenantId={activeTenantId}
                    />

                    <SidebarTrigger size="icon" className="shrink-0" />
                </div>

                <NavMain items={navItems} />
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

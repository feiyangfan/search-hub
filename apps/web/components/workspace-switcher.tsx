'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronsUpDown, Plus, Briefcase } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

type Workspace = {
    name: string;
    logo?: React.ElementType;
    role?: string;
};

export function WorkspaceSwitcher({ workspaces }: { workspaces: Workspace[] }) {
    const { isMobile } = useSidebar();
    const hasWorkspaces = workspaces.length > 0;
    const [activeWorkspace, setActiveWorkspace] = React.useState<
        Workspace | undefined
    >(hasWorkspaces ? workspaces[0] : undefined);

    React.useEffect(() => {
        if (hasWorkspaces) {
            setActiveWorkspace(workspaces[0]);
        }
    }, [hasWorkspaces, workspaces]);

    const ActiveLogo = activeWorkspace?.logo ?? DefaultWorkspaceIcon;

    if (!hasWorkspaces || !activeWorkspace) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="lg">
                        <Link href="/dashboard/tenants/new">
                            <div className="bg-sidebar-primary/80 text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg">
                                <Plus className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    Create workspace
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    Start by adding your first workspace
                                </span>
                            </div>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <ActiveLogo className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {activeWorkspace.name}
                                </span>
                                <span className="truncate text-xs">
                                    {activeWorkspace.role ?? 'Member'}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? 'bottom' : 'right'}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            workspaces
                        </DropdownMenuLabel>
                        {workspaces.map((workspace, index) => (
                            <DropdownMenuItem
                                key={workspace.name}
                                onClick={() => setActiveWorkspace(workspace)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border">
                                    <WorkspaceIcon workspace={workspace} />
                                </div>
                                {workspace.name}
                                <DropdownMenuShortcut>
                                    ⌘{index + 1}
                                </DropdownMenuShortcut>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="gap-2 p-2">
                            <Link href="/dashboard/tenants/new">
                                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                    <Plus className="size-4" />
                                </div>
                                <div className="text-muted-foreground font-medium">
                                    Add workspace
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
    const Icon = workspace.logo ?? DefaultWorkspaceIcon;
    return <Icon className="size-3.5 shrink-0" />;
}

function DefaultWorkspaceIcon(props: React.SVGProps<SVGSVGElement>) {
    return <Briefcase {...props} />;
}

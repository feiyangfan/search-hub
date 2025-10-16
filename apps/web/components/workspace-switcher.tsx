'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    id?: string;
    name: string;
    logo?: React.ElementType;
    role?: string;
};

interface WorkspaceSwitcherProps {
    workspaces: Workspace[];
    activeTenantId?: string;
}

export function WorkspaceSwitcher({
    workspaces,
    activeTenantId,
}: WorkspaceSwitcherProps) {
    const { isMobile } = useSidebar();
    const router = useRouter();
    const [, startTransition] = React.useTransition();
    const [activeIndex, setActiveIndex] = React.useState(() => {
        if (!workspaces.length) {
            return 0;
        }
        if (!activeTenantId) {
            return 0;
        }
        const initialIndex = workspaces.findIndex(
            (workspace) => workspace.id === activeTenantId
        );
        return initialIndex >= 0 ? initialIndex : 0;
    });

    React.useEffect(() => {
        if (!workspaces.length) {
            setActiveIndex(0);
            return;
        }

        if (!activeTenantId) {
            setActiveIndex(0);
            return;
        }

        const nextIndex = workspaces.findIndex(
            (workspace) => workspace.id === activeTenantId
        );

        if (nextIndex >= 0 && nextIndex !== activeIndex) {
            setActiveIndex(nextIndex);
        }
    }, [workspaces, activeTenantId, activeIndex]);

    const activeWorkspace = workspaces[activeIndex];
    const ActiveLogo = activeWorkspace?.logo ?? DefaultWorkspaceIcon;

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
                                key={workspace.id ?? workspace.name}
                                disabled={activeIndex === index}
                                onClick={() => {
                                    if (activeIndex === index) {
                                        return;
                                    }

                                    if (!workspace.id) {
                                        setActiveIndex(index);
                                        return;
                                    }

                                    startTransition(async () => {
                                        try {
                                            await fetch('/api/tenants/active', {
                                                method: 'POST',
                                                headers: {
                                                    'content-type':
                                                        'application/json',
                                                },
                                                body: JSON.stringify({
                                                    id: workspace.id,
                                                }),
                                            });
                                        } catch {
                                            // swallow to keep UX responsive; server refresh will re-sync
                                        } finally {
                                            setActiveIndex(index);
                                            router.refresh();
                                        }
                                    });
                                }}
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

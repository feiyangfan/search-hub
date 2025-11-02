'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Plus, Briefcase, Loader2, Pencil } from 'lucide-react';

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import { WorkspaceDeletionConfirmationDialog } from '../workspace/workspace-deletion';

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
    const { toast } = useToast();
    const { isMobile } = useSidebar();
    const router = useRouter();
    const [, startTransition] = React.useTransition();
    const [isSwitching, setIsSwitching] = React.useState(false);
    const [showRenameDialog, setShowRenameDialog] = React.useState(false);
    const [renamingWorkspace, setRenamingWorkspace] =
        React.useState<Workspace | null>(null);
    const [newName, setNewName] = React.useState('');
    const [isRenaming, setIsRenaming] = React.useState(false);
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

    const handleRename = async () => {
        if (!renamingWorkspace?.id || !newName.trim()) {
            return;
        }

        if (newName.trim() === renamingWorkspace.name) {
            setShowRenameDialog(false);
            return;
        }

        setIsRenaming(true);
        try {
            const response = await fetch('/api/tenants', {
                method: 'PATCH',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    id: renamingWorkspace.id,
                    name: newName.trim(),
                }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(data?.error || 'Failed to rename workspace');
            }

            toast.success('Workspace renamed', {
                description: `Renamed to "${newName.trim()}"`,
            });

            router.refresh();
            setShowRenameDialog(false);
        } catch (error) {
            toast.error('Failed to rename workspace', {
                description:
                    (error as { message?: string }).message ??
                    'Please try again.',
            });
        } finally {
            setIsRenaming(false);
        }
    };

    const activeWorkspace = workspaces[activeIndex];
    if (!activeWorkspace) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <div className="flex items-center gap-2 p-3">
                        <Skeleton className="size-8 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-3 w-24 rounded" />
                        </div>
                    </div>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }
    const ActiveLogo = activeWorkspace.logo ?? DefaultWorkspaceIcon;

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
                                disabled={activeIndex === index || isSwitching}
                                onClick={() => {
                                    if (activeIndex === index || isSwitching) {
                                        return;
                                    }

                                    if (!workspace.id) {
                                        setActiveIndex(index);
                                        return;
                                    }

                                    startTransition(async () => {
                                        setIsSwitching(true);
                                        try {
                                            const response = await fetch(
                                                '/api/tenants/active',
                                                {
                                                    method: 'POST',
                                                    headers: {
                                                        'content-type':
                                                            'application/json',
                                                    },
                                                    body: JSON.stringify({
                                                        id: workspace.id,
                                                    }),
                                                }
                                            );

                                            if (!response.ok) {
                                                const data = (await response
                                                    .json()
                                                    .catch(() => null)) as {
                                                    error?: string;
                                                } | null;
                                                throw new Error(
                                                    data?.error ||
                                                        'Failed to switch workspace'
                                                );
                                            }

                                            // Dispatch event to refresh document list
                                            window.dispatchEvent(
                                                new CustomEvent(
                                                    'workspaceSwitched'
                                                )
                                            );

                                            // Redirect to dashboard
                                            router.push('/dashboard');
                                            router.refresh();
                                        } catch (error) {
                                            toast.error(
                                                'Failed to switch workspace',
                                                {
                                                    description:
                                                        (
                                                            error as {
                                                                message?: string;
                                                            }
                                                        ).message ??
                                                        'Please try again.',
                                                }
                                            );
                                        } finally {
                                            setActiveIndex(index);
                                            setIsSwitching(false);
                                        }
                                    });
                                }}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-md border">
                                    {isSwitching && activeIndex === index ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <WorkspaceIcon workspace={workspace} />
                                    )}
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
                        {activeWorkspace?.role === 'owner' &&
                            activeWorkspace?.id && (
                                <DropdownMenuItem
                                    className="gap-2 p-2"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setRenamingWorkspace(activeWorkspace);
                                        setNewName(activeWorkspace.name);
                                        setShowRenameDialog(true);
                                    }}
                                >
                                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                        <Pencil className="size-4" />
                                    </div>
                                    <div className="text-muted-foreground font-medium">
                                        Rename workspace
                                    </div>
                                </DropdownMenuItem>
                            )}
                        {activeWorkspace?.role === 'owner' ? (
                            <WorkspaceDeletionConfirmationDialog
                                workspaceName={activeWorkspace.name}
                                onConfirm={() =>
                                    startTransition(async () => {
                                        try {
                                            if (!activeWorkspace?.id) {
                                                toast.error('Delete failed', {
                                                    description:
                                                        'Workspace id is missing. Please wait and try again.',
                                                });
                                                return;
                                            }
                                            const res = await fetch(
                                                '/api/tenants',
                                                {
                                                    method: 'DELETE',
                                                    headers: {
                                                        'content-type':
                                                            'application/json',
                                                    },
                                                    body: JSON.stringify({
                                                        id: activeWorkspace.id,
                                                    }),
                                                }
                                            );

                                            if (!res.ok) {
                                                const data = (await res
                                                    .json()
                                                    .catch(() => null)) as {
                                                    error?: string;
                                                } | null;
                                                toast.error('Delete failed', {
                                                    description:
                                                        data?.error ??
                                                        'Please try again.',
                                                });
                                                return;
                                            }

                                            toast.success('Workspace deleted', {
                                                description: `${activeWorkspace.name} has been removed.`,
                                            });

                                            router.refresh();
                                        } catch (err) {
                                            toast.error('Delete failed', {
                                                description:
                                                    (
                                                        err as {
                                                            message?: string;
                                                        }
                                                    ).message ??
                                                    'Please try again.',
                                            });
                                            router.refresh();
                                        }
                                    })
                                }
                            />
                        ) : (
                            ''
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>

            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename workspace</DialogTitle>
                        <DialogDescription>
                            Enter a new name for &quot;{renamingWorkspace?.name}
                            &quot;
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Workspace name"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isRenaming) {
                                handleRename();
                            }
                        }}
                        disabled={isRenaming}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowRenameDialog(false)}
                            disabled={isRenaming}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRename}
                            disabled={isRenaming || !newName.trim()}
                        >
                            {isRenaming ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Renaming...
                                </>
                            ) : (
                                'Rename'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

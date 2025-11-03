import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavDocumentActions({
    documentId,
    onRename,
    onDelete,
    isActive = false,
}: {
    documentId: string;
    onRename?: () => void;
    onDelete?: () => void;
    isActive?: boolean;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                    showOnHover
                    className={cn(
                        isActive && [
                            'md:group-focus-within/menu-item:opacity-0',
                            'md:group-hover/menu-item:opacity-100',
                            'md:data-[state=open]:opacity-100',
                            'md:focus-visible:opacity-100',
                            'focus:opacity-100',
                            'focus-visible:opacity-100',
                        ]
                    )}
                >
                    <MoreHorizontal />
                    <span className="sr-only">Document actions</span>
                </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-48 rounded-lg"
                side="right"
                align="start"
            >
                <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
                <DropdownMenuItem>Edit tags</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={onDelete}
                    className="text-destructive focus:text-destructive"
                >
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

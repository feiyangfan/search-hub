import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { MoreHorizontal, Star, StarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NavDocumentActions({
    documentId,
    onRename,
    onDelete,
    isActive = false,
    onToggleFavorite,
    isFavorite,
    favoriteToggleDisabled = false,
    onEditTags,
}: {
    documentId: string;
    onRename?: () => void;
    onDelete?: () => void;
    isActive?: boolean;
    onToggleFavorite?: () => void;
    isFavorite?: boolean;
    favoriteToggleDisabled?: boolean;
    onEditTags?: () => void;
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
                {onToggleFavorite ? (
                    <DropdownMenuItem
                        disabled={favoriteToggleDisabled}
                        onSelect={(event) => {
                            event.preventDefault();
                            if (favoriteToggleDisabled) return;
                            onToggleFavorite();
                        }}
                    >
                        {isFavorite ? (
                            <StarOff className="mr-2 h-4 w-4" />
                        ) : (
                            <Star className="mr-2 h-4 w-4" />
                        )}
                        {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    </DropdownMenuItem>
                ) : null}
                {onEditTags ? (
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            onEditTags();
                        }}
                    >
                        Edit tags
                    </DropdownMenuItem>
                ) : null}
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

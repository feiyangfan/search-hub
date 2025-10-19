'use client';

import {
    ArrowUpRight,
    ChevronDown,
    Link,
    MoreHorizontal,
    StarOff,
    Trash2,
} from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

export function NavFavorites({
    favorites,
}: {
    favorites: {
        name: string;
        url: string;
        emoji: string;
    }[];
}) {
    const { isMobile } = useSidebar();

    return (
        <Collapsible defaultOpen>
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel asChild className="pr-3">
                    <CollapsibleTrigger className="group/collapsible flex w-full items-center justify-start gap-1 rounded-md px-2 py-1 text-left text-xs font-medium text-sidebar-foreground/80 outline-hidden ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-[transform,opacity] [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180">
                        <span className="truncate">Favorites</span>
                        <ChevronDown className="opacity-0 group-hover/collapsible:opacity-100 group-focus-visible/collapsible:opacity-100" />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent asChild>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {favorites.map((item) => (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.url} title={item.name}>
                                            <span>{item.emoji}</span>
                                            <span>{item.name}</span>
                                        </a>
                                    </SidebarMenuButton>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <SidebarMenuAction showOnHover>
                                                <MoreHorizontal />
                                                <span className="sr-only">
                                                    More
                                                </span>
                                            </SidebarMenuAction>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            className="w-56 rounded-lg"
                                            side={isMobile ? 'bottom' : 'right'}
                                            align={isMobile ? 'end' : 'start'}
                                        >
                                            <DropdownMenuItem>
                                                <StarOff className="text-muted-foreground" />
                                                <span>
                                                    Remove from Favorites
                                                </span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>
                                                <Link className="text-muted-foreground" />
                                                <span>Copy Link</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <ArrowUpRight className="text-muted-foreground" />
                                                <span>Open in New Tab</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>
                                                <Trash2 className="text-muted-foreground" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </SidebarMenuItem>
                            ))}
                            <SidebarMenuItem>
                                <SidebarMenuButton className="text-sidebar-foreground/70">
                                    <MoreHorizontal />
                                    <span>More</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

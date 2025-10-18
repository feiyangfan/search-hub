import { MoreHorizontal, Plus } from 'lucide-react';

import { Button } from '../ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function NavDocuments({
    documents,
    isLoading,
}: {
    documents: {
        id: string;
        title: string;
        updatedAt?: string | undefined;
        isFavorite: boolean;
    }[];
    isLoading: boolean;
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel className="justify-between">
                Documents{' '}
                <Button
                    variant="ghost"
                    size="icon"
                    className="data-[state=open]:bg-accent h-7 w-7"
                >
                    <Plus />
                </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                {isLoading ? (
                    <SidebarMenu>
                        {[1, 2, 3].map((key) => (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton>
                                    <Skeleton className="h-4 w-36" />
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                ) : (
                    <SidebarMenu>
                        {documents.map((document) => (
                            <Collapsible key={document.title}>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="#">
                                            {/* <span>{document.emoji}</span> */}
                                            <span>{document.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </Collapsible>
                        ))}
                        <SidebarMenuItem>
                            <SidebarMenuButton className="text-sidebar-foreground/70">
                                <MoreHorizontal />
                                <span>More</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

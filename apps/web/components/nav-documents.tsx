import { MoreHorizontal, Plus } from 'lucide-react';

import { Button } from './ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

export function NavDocuments({
    documents,
}: {
    documents: {
        name: string;
        emoji: React.ReactNode;
        pages: {
            name: string;
            emoji: React.ReactNode;
        }[];
    }[];
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
                <SidebarMenu>
                    {documents.map((document) => (
                        <Collapsible key={document.name}>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <a href="#">
                                        <span>{document.emoji}</span>
                                        <span>{document.name}</span>
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
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

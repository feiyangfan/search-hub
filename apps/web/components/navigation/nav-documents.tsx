import { ChevronDown, Loader2, Plus, File, MoreHorizontal } from 'lucide-react';

import { Button } from '../ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

import { NavDocumentActions } from './nav-document-actions';

export function NavDocuments({
    documents,
    isLoading,
    hasMore = false,
    onLoadMore,
    isLoadingMore = false,
}: {
    documents: {
        id: string;
        title: string;
        updatedAt?: string | undefined;
        isFavorite: boolean;
    }[];
    isLoading: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
}) {
    return (
        <Collapsible defaultOpen>
            <SidebarGroup>
                <SidebarGroupLabel asChild className="peer pr-9">
                    <CollapsibleTrigger className="group/collapsible flex w-full items-center justify-start gap-1 rounded-md px-2 py-1 text-left text-xs font-medium text-sidebar-foreground/80 outline-hidden ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-[transform,opacity] [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180">
                        <span className="truncate">Documents</span>
                        <ChevronDown className="opacity-0 group-hover/collapsible:opacity-100 group-focus-visible/collapsible:opacity-100" />
                    </CollapsibleTrigger>
                </SidebarGroupLabel>
                <SidebarGroupAction asChild>
                    <Link
                        href="/dashboard/documents/new"
                        className="h-4 w-4 opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 peer-hover:opacity-100 peer-focus-visible:opacity-100 flex items-center justify-center rounded-md"
                        aria-label="Create document"
                    >
                        <Plus className="h-3 w-3" />
                    </Link>
                </SidebarGroupAction>
                <CollapsibleContent asChild>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {isLoading
                                ? [1, 2, 3].map((key) => (
                                      <SidebarMenuItem key={key}>
                                          <SidebarMenuButton>
                                              <Skeleton className="h-4 w-36" />
                                          </SidebarMenuButton>
                                      </SidebarMenuItem>
                                  ))
                                : documents.map((document) => (
                                      <SidebarMenuItem key={document.id}>
                                          <SidebarMenuButton asChild>
                                              <a
                                                  href={`/doc/${document.id}`}
                                                  className="flex items-center gap-2"
                                              >
                                                  <File className="inline-block h-4 w-4 shrink-0" />
                                                  <span>{document.title}</span>
                                              </a>
                                          </SidebarMenuButton>
                                          <NavDocumentActions
                                              documentId={document.id}
                                          />
                                      </SidebarMenuItem>
                                  ))}
                            {!isLoading && hasMore ? (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => onLoadMore?.()}
                                        disabled={isLoadingMore || !onLoadMore}
                                        className="text-sidebar-foreground/70"
                                    >
                                        {isLoadingMore ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <MoreHorizontal />
                                        )}
                                        <span>More</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) : null}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

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
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { NavDocumentActions } from './nav-document-actions';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocumentsListQuery } from '@/hooks/use-documents';

type NavFavoritesProps = {
    activeTenantId?: string;
};

const DEFAULT_DOCUMENT_EMOJI = '📄';

function extractIconEmoji(metadata: unknown): string | null {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        const iconEmoji = (metadata as Record<string, unknown>).iconEmoji;
        if (typeof iconEmoji === 'string' && iconEmoji.length > 0) {
            return iconEmoji;
        }
    }
    return null;
}

export function NavFavorites({ activeTenantId }: NavFavoritesProps) {
    const pathname = usePathname();
    const { renameDocument, deleteDocument, toggleFavorite, editDocumentTags } =
        useDocumentActions();
    const { data: favoritesData, isLoading } = useDocumentsListQuery({
        favoritesOnly: true,
        limit: 20,
        tenantId: activeTenantId,
        enabled: Boolean(activeTenantId),
    });
    const favorites = favoritesData?.items ?? [];
    const isFavoritesLoading = !activeTenantId || isLoading;

    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
        null
    );
    const [originalTitle, setOriginalTitle] = useState('');
    const [deletingDocument, setDeletingDocument] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const [favoriteActionId, setFavoriteActionId] = useState<string | null>(
        null
    );
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingDocumentId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingDocumentId]);

    const handleRename = useCallback(
        (documentId: string, currentTitle: string) => {
            setEditingDocumentId(documentId);
            setOriginalTitle(currentTitle);
        },
        []
    );

    const handleRenameCancel = useCallback(() => {
        setEditingDocumentId(null);
    }, []);

    const handleRenameSubmit = useCallback(
        async (documentId: string, newTitle: string) => {
            const trimmedTitle = newTitle.trim();
            if (!trimmedTitle || trimmedTitle === originalTitle) {
                setEditingDocumentId(null);
                return;
            }

            renameDocument(documentId, trimmedTitle);
            setEditingDocumentId(null);
        },
        [originalTitle, renameDocument]
    );

    const handleDelete = useCallback((documentId: string, title: string) => {
        setDeletingDocument({ id: documentId, title });
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deletingDocument) return;
        await deleteDocument(deletingDocument.id, deletingDocument.title);
        setDeletingDocument(null);
    }, [deleteDocument, deletingDocument]);

    const handleFavoriteToggle = useCallback(
        async (documentId: string, makeFavorite: boolean) => {
            setFavoriteActionId(documentId);
            try {
                await toggleFavorite(documentId, makeFavorite);
            } finally {
                setFavoriteActionId(null);
            }
        },
        [toggleFavorite]
    );

    return (
        favorites.length > 0 && (
            <>
                <Collapsible defaultOpen>
                    <SidebarGroup>
                        <SidebarGroupLabel asChild className="pr-9">
                            <CollapsibleTrigger className="group/collapsible flex w-full items-center justify-start gap-1 rounded-md px-2 py-1 text-left text-xs font-medium text-sidebar-foreground/80 outline-hidden ring-sidebar-ring transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-[transform,opacity] [&>svg]:duration-200 data-[state=open]:[&>svg]:rotate-180">
                                <span className="truncate">Favorites</span>
                                <ChevronDown className="opacity-0 group-hover/collapsible:opacity-100 group-focus-visible/collapsible:opacity-100" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent asChild>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {isFavoritesLoading
                                        ? [1, 2].map((key) => (
                                              <SidebarMenuItem key={key}>
                                                  <SidebarMenuButton>
                                                      <Skeleton className="h-4 w-36" />
                                                  </SidebarMenuButton>
                                              </SidebarMenuItem>
                                          ))
                                        : null}

                                    {!isFavoritesLoading &&
                                        favorites.map((document) => {
                                                const isActive =
                                                    pathname ===
                                                        `/doc/${document.id}` ||
                                                    pathname?.startsWith(
                                                        `/doc/${document.id}/`
                                                    );
                                                const documentTitle =
                                                    document.title ||
                                                    'Untitled document';
                                                const documentEmoji =
                                                    extractIconEmoji(
                                                        document.metadata
                                                    ) ?? DEFAULT_DOCUMENT_EMOJI;

                                                return (
                                                    <SidebarMenuItem
                                                        key={document.id}
                                                    >
                                                    {editingDocumentId ===
                                                    document.id ? (
                                                                <div className="flex items-center gap-2 px-2 py-1.5">
                                                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base">
                                                                {documentEmoji}
                                                            </span>
                                                            <input
                                                                ref={inputRef}
                                                                type="text"
                                                                defaultValue={
                                                                    documentTitle
                                                                }
                                                                className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-gray-300"
                                                                onKeyDown={(
                                                                    event
                                                                ) => {
                                                                    if (
                                                                        event.key ===
                                                                        'Enter'
                                                                    ) {
                                                                        handleRenameSubmit(
                                                                            document.id,
                                                                            event
                                                                                .currentTarget
                                                                                .value
                                                                        );
                                                                    } else if (
                                                                        event.key ===
                                                                        'Escape'
                                                                    ) {
                                                                        handleRenameCancel();
                                                                    }
                                                                }}
                                                                onBlur={(
                                                                    event
                                                                ) =>
                                                                    handleRenameSubmit(
                                                                        document.id,
                                                                        event
                                                                            .currentTarget
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <SidebarMenuButton
                                                                asChild
                                                                isActive={
                                                                    isActive
                                                                }
                                                                className="group/menu-item"
                                                            >
                                                                <Link
                                                                    href={`/doc/${document.id}`}
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                                                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-base">
                                                                            {
                                                                                documentEmoji
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="truncate">
                                                                        {documentTitle}
                                                                    </span>
                                                                </Link>
                                                            </SidebarMenuButton>
                                                            <NavDocumentActions
                                                                documentId={
                                                                    document.id
                                                                }
                                                                onRename={() =>
                                                                    handleRename(
                                                                        document.id,
                                                                        documentTitle
                                                                    )
                                                                }
                                                                onDelete={() =>
                                                                    handleDelete(
                                                                        document.id,
                                                                        documentTitle
                                                                    )
                                                                }
                                                                onToggleFavorite={() =>
                                                                    handleFavoriteToggle(
                                                                        document.id,
                                                                        false
                                                                    )
                                                                }
                                                                onEditTags={() =>
                                                                    editDocumentTags(
                                                                        document.id
                                                                    )
                                                                }
                                                                isFavorite
                                                                favoriteToggleDisabled={
                                                                    favoriteActionId ===
                                                                    document.id
                                                                }
                                                                isActive={
                                                                    isActive
                                                                }
                                                            />
                                                        </>
                                                    )}
                                                </SidebarMenuItem>
                                            );
                                        })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                <AlertDialog
                    open={!!deletingDocument}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeletingDocument(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Delete document?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete &quot;
                                {deletingDocument?.title}&quot; and all of its
                                content.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )
    );
}

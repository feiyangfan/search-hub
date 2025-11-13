import { ChevronDown, Plus, File } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

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
import { NavDocumentActions } from './nav-document-actions';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocumentsListQuery } from '@/hooks/use-documents';

type NavDocumentsProps = {
    activeTenantId?: string;
};

export function NavDocuments({ activeTenantId }: NavDocumentsProps) {
    const pathname = usePathname();
    const { data: documentsData, isLoading } = useDocumentsListQuery({
        limit: 20,
        tenantId: activeTenantId,
        enabled: Boolean(activeTenantId),
    });

    const documents = documentsData?.items ?? [];
    const isListLoading = !activeTenantId || isLoading;

    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
        null
    );
    const [originalTitle, setOriginalTitle] = useState<string>('');
    const [deletingDocument, setDeletingDocument] = useState<{
        id: string;
        title: string;
    } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [favoriteActionId, setFavoriteActionId] = useState<string | null>(
        null
    );
    const { renameDocument, deleteDocument, toggleFavorite, editDocumentTags } =
        useDocumentActions();

    useEffect(() => {
        if (editingDocumentId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingDocumentId]);

    const handleRename = (documentId: string, currentTitle: string) => {
        setEditingDocumentId(documentId);
        setOriginalTitle(currentTitle);
    };

    const handleRenameSubmit = async (documentId: string, newTitle: string) => {
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle || trimmedTitle === originalTitle) {
            setEditingDocumentId(null);
            return;
        }

        renameDocument(documentId, trimmedTitle);
        setEditingDocumentId(null);
    };

    const handleRenameCancel = () => {
        setEditingDocumentId(null);
    };

    const handleDelete = (documentId: string, documentTitle: string) => {
        setDeletingDocument({ id: documentId, title: documentTitle });
    };

    const handleDeleteConfirm = async () => {
        if (!deletingDocument) return;

        await deleteDocument(deletingDocument.id, deletingDocument.title);
        setDeletingDocument(null);
    };

    const handleFavoriteToggle = (
        documentId: string,
        makeFavorite: boolean
    ) => {
        setFavoriteActionId(documentId);
        toggleFavorite(documentId, makeFavorite).finally(() => {
            setFavoriteActionId(null);
        });
    };

    return (
        <>
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
                                {isListLoading
                                    ? [1, 2, 3].map((key) => (
                                          <SidebarMenuItem key={key}>
                                              <SidebarMenuButton>
                                                  <Skeleton className="h-4 w-36" />
                                              </SidebarMenuButton>
                                          </SidebarMenuItem>
                                      ))
                                    : documents.map((document) => {
                                          const isActive =
                                              pathname ===
                                                  `/doc/${document.id}` ||
                                              pathname?.startsWith(
                                                  `/doc/${document.id}/`
                                              );

                                          return (
                                              <SidebarMenuItem
                                                  key={document.id}
                                              >
                                                  {editingDocumentId ===
                                                  document.id ? (
                                                      <div className="flex items-center gap-2 px-2 py-1.5">
                                                          <File className="inline-block h-4 w-4 shrink-0" />
                                                          <input
                                                              ref={inputRef}
                                                              type="text"
                                                              defaultValue={
                                                                  document.title
                                                              }
                                                              className="flex-1 bg-transparent text-sm outline-none border border-transparent rounded px-1 py-0.5 focus:border-gray-300"
                                                              onKeyDown={(
                                                                  e
                                                              ) => {
                                                                  if (
                                                                      e.key ===
                                                                      'Enter'
                                                                  ) {
                                                                      handleRenameSubmit(
                                                                          document.id,
                                                                          e
                                                                              .currentTarget
                                                                              .value
                                                                      );
                                                                  } else if (
                                                                      e.key ===
                                                                      'Escape'
                                                                  ) {
                                                                      handleRenameCancel();
                                                                  }
                                                              }}
                                                              onBlur={(e) => {
                                                                  handleRenameSubmit(
                                                                      document.id,
                                                                      e
                                                                          .currentTarget
                                                                          .value
                                                                  );
                                                              }}
                                                          />
                                                      </div>
                                                  ) : (
                                                      <>
                                                          <SidebarMenuButton
                                                              asChild
                                                              isActive={
                                                                  isActive
                                                              }
                                                          >
                                                              <Link
                                                                  href={`/doc/${document.id}`}
                                                                  className="flex items-center gap-2"
                                                              >
                                                                  <File className="inline-block h-4 w-4 shrink-0" />
                                                                  <span>
                                                                      {
                                                                          document.title
                                                                      }
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
                                                                      document.title ||
                                                                          'Untitled document'
                                                                  )
                                                              }
                                                              onDelete={() =>
                                                                  handleDelete(
                                                                      document.id,
                                                                      document.title ||
                                                                          'Untitled document'
                                                                  )
                                                              }
                                                              onToggleFavorite={() =>
                                                                  handleFavoriteToggle(
                                                                      document.id,
                                                                      !document.isFavorite
                                                                  )
                                                              }
                                                              isFavorite={
                                                                  document.isFavorite
                                                              }
                                                              favoriteToggleDisabled={
                                                                  favoriteActionId ===
                                                                  document.id
                                                              }
                                                              onEditTags={() =>
                                                                  editDocumentTags(
                                                                      document.id
                                                                  )
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
                onOpenChange={(open) => !open && setDeletingDocument(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete &quot;{deletingDocument?.title}&quot; and all
                            of its content.
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
    );
}

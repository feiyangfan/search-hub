import { ChevronDown, Plus, File, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
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
import { Button } from '@/components/ui/button';
import { NavDocumentActions } from './nav-document-actions';
import { useDocumentActions } from '@/hooks/use-document-actions';
import { useDocumentsListQuery } from '@/hooks/use-documents';

type NavDocumentsProps = {
    activeTenantId?: string;
};

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 420;
const PICKER_MARGIN = 16;

type EmojiPickerState = {
    documentId: string;
    documentTitle: string;
    position: { top: number; left: number };
};

function calculatePickerPosition(rect?: DOMRect | null) {
    if (typeof window === 'undefined') {
        return { top: PICKER_MARGIN, left: PICKER_MARGIN };
    }

    let top = rect
        ? rect.bottom + 8
        : window.innerHeight / 2 - PICKER_HEIGHT / 2;
    let left = rect ? rect.left : window.innerWidth / 2 - PICKER_WIDTH / 2;

    const maxTop = window.innerHeight - PICKER_HEIGHT - PICKER_MARGIN;
    const maxLeft = window.innerWidth - PICKER_WIDTH - PICKER_MARGIN;

    top = Math.max(PICKER_MARGIN, Math.min(top, maxTop));
    left = Math.max(PICKER_MARGIN, Math.min(left, maxLeft));

    return { top, left };
}

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
    const [emojiPickerState, setEmojiPickerState] =
        useState<EmojiPickerState | null>(null);
    const [documentEmojis, setDocumentEmojis] = useState<
        Record<string, string>
    >({});
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

    useEffect(() => {
        if (!emojiPickerState) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setEmojiPickerState(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [emojiPickerState]);

    const openEmojiPicker = (
        documentId: string,
        title: string,
        event?: Event
    ) => {
        const anchor = (event?.currentTarget as HTMLElement | null) ?? null;
        const rect = anchor?.getBoundingClientRect() ?? null;
        const position = calculatePickerPosition(rect);
        setEmojiPickerState({
            documentId,
            documentTitle: title,
            position,
        });
    };

    const handleEmojiSelect = (emojiData: EmojiClickData) => {
        if (!emojiPickerState) return;
        setDocumentEmojis((prev) => ({
            ...prev,
            [emojiPickerState.documentId]: emojiData.emoji,
        }));
        setEmojiPickerState(null);
    };

    const handleEmojiReset = () => {
        if (!emojiPickerState) return;
        setDocumentEmojis((prev) => {
            const next = { ...prev };
            delete next[emojiPickerState.documentId];
            return next;
        });
        setEmojiPickerState(null);
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
                                          const documentTitle =
                                              document.title ||
                                              'Untitled document';
                                          const documentEmoji =
                                              documentEmojis[document.id];

                                          return (
                                              <SidebarMenuItem
                                                  key={document.id}
                                              >
                                                  {editingDocumentId ===
                                                  document.id ? (
                                                      <div className="flex items-center gap-2 px-2 py-1.5">
                                                          {documentEmoji ? (
                                                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base">
                                                                  {
                                                                      documentEmoji
                                                                  }
                                                              </span>
                                                          ) : (
                                                              <File className="inline-block h-4 w-4 shrink-0" />
                                                          )}
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
                                                                  className="flex items-center gap-1"
                                                              >
                                                                  <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                                                                      {documentEmoji ? (
                                                                          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-base">
                                                                              {
                                                                                  documentEmoji
                                                                              }
                                                                          </span>
                                                                      ) : (
                                                                          <File
                                                                              size="icon"
                                                                              className="inline-block h-4 w-4"
                                                                          />
                                                                      )}
                                                                  </div>

                                                                  <span>
                                                                      {
                                                                          documentTitle
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
                                                              onChangeIcon={(
                                                                  event
                                                              ) =>
                                                                  openEmojiPicker(
                                                                      document.id,
                                                                      documentTitle,
                                                                      event
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

            {emojiPickerState ? (
                <div
                    className="fixed inset-0 z-50"
                    onClick={() => setEmojiPickerState(null)}
                >
                    <div
                        className="absolute z-50 rounded-2xl border bg-popover shadow-2xl"
                        style={{
                            top: emojiPickerState.position.top,
                            left: emojiPickerState.position.left,
                            width: PICKER_WIDTH,
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            lazyLoadEmojis
                            skinTonesDisabled
                            width={PICKER_WIDTH}
                            height={PICKER_HEIGHT - 80}
                            previewConfig={{ showPreview: false }}
                        />
                        <div className="flex items-center justify-between border-t px-4 py-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleEmojiReset}
                            >
                                <File className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

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

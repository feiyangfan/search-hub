import { ChevronDown, Loader2, Plus } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { useInfiniteDocumentsQuery } from '@/hooks/use-documents';
import type { GetDocumentListResponseType } from '@search-hub/schemas';

type NavDocumentsProps = {
    activeTenantId?: string;
};

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 420;
const PICKER_MARGIN = 16;
const DEFAULT_DOCUMENT_EMOJI = '📄';

type EmojiPickerState = {
    documentId: string;
    documentTitle: string;
    position: { top: number; left: number };
};

function extractIconEmoji(metadata: unknown): string | null {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        const iconEmoji = (metadata as Record<string, unknown>).iconEmoji;
        if (typeof iconEmoji === 'string' && iconEmoji.length > 0) {
            return iconEmoji;
        }
    }
    return null;
}

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
    const queryClient = useQueryClient();
    const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
        useInfiniteDocumentsQuery({
            tenantId: activeTenantId,
            enabled: Boolean(activeTenantId),
            limit: 5,
        });
    const documents = data?.pages.flatMap((page) => page.items ?? []) ?? [];
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
    const {
        renameDocument,
        deleteDocument,
        toggleFavorite,
        editDocumentTags,
        createDocument,
        createDocumentPending,
    } = useDocumentActions();

    useEffect(() => {
        if (editingDocumentId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingDocumentId]);

    useEffect(() => {
        if (!documents.length) {
            setDocumentEmojis((prev) => {
                if (Object.keys(prev).length === 0) {
                    return prev;
                }
                return {};
            });
            return;
        }

        setDocumentEmojis((prev) => {
            let changed = false;
            const next = { ...prev };
            const seenIds = new Set<string>();

            documents.forEach((doc) => {
                seenIds.add(doc.id);
                const serverEmoji = extractIconEmoji(doc.metadata);
                if (serverEmoji) {
                    if (next[doc.id] !== serverEmoji) {
                        next[doc.id] = serverEmoji;
                        changed = true;
                    }
                } else if (next[doc.id]) {
                    delete next[doc.id];
                    changed = true;
                }
            });

            Object.keys(next).forEach((docId) => {
                if (!seenIds.has(docId)) {
                    delete next[docId];
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [documents]);

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

    const applyIconToCachedLists = (
        documentId: string,
        iconEmoji: string | null
    ) => {
        const listQueries =
            queryClient.getQueriesData<GetDocumentListResponseType>({
                queryKey: ['documents'],
            }) ?? [];

        listQueries.forEach(([key, data]) => {
            if (!data?.documents?.items) return;
            const nextItems = data.documents.items.map((doc) => {
                if (doc.id !== documentId) return doc;
                const nextMetadata =
                    iconEmoji !== null
                        ? {
                              ...(doc.metadata &&
                              typeof doc.metadata === 'object'
                                  ? doc.metadata
                                  : {}),
                              iconEmoji,
                          }
                        : (() => {
                              if (
                                  doc.metadata &&
                                  typeof doc.metadata === 'object'
                              ) {
                                  const { iconEmoji: _ignore, ...rest } =
                                      doc.metadata as Record<string, unknown>;
                                  const cleaned = { ...rest };
                                  if (Object.keys(cleaned).length === 0) {
                                      return undefined;
                                  }
                                  return cleaned;
                              }
                              return undefined;
                          })();
                return { ...doc, metadata: nextMetadata };
            });
            queryClient.setQueryData<GetDocumentListResponseType>(key, {
                ...data,
                documents: { ...data.documents, items: nextItems },
            });
        });
    };

    const updateDocumentIcon = async (
        documentId: string,
        nextEmoji: string | null
    ) => {
        const previousEmoji = documentEmojis[documentId] ?? null;

        setDocumentEmojis((prev) => {
            const next = { ...prev };
            if (nextEmoji && nextEmoji.length > 0) {
                next[documentId] = nextEmoji;
            } else {
                delete next[documentId];
            }
            return next;
        });
        applyIconToCachedLists(documentId, nextEmoji);

        try {
            const response = await fetch(`/api/documents/${documentId}/icon`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ iconEmoji: nextEmoji }),
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = (await response.json()) as {
                document?: { iconEmoji?: string | null };
            };
            const savedEmoji = data.document?.iconEmoji ?? null;

            setDocumentEmojis((prev) => {
                const next = { ...prev };
                if (savedEmoji) {
                    next[documentId] = savedEmoji;
                } else {
                    delete next[documentId];
                }
                return next;
            });
            applyIconToCachedLists(documentId, savedEmoji);

            void queryClient.invalidateQueries({ queryKey: ['documents'] });
            void queryClient.invalidateQueries({
                queryKey: [
                    'documents',
                    { favoritesOnly: true, limit: 20, offset: 0 },
                ],
            });
        } catch (error) {
            console.error('Failed to update document icon', error);
            setDocumentEmojis((prev) => {
                const next = { ...prev };
                if (previousEmoji) {
                    next[documentId] = previousEmoji;
                } else {
                    delete next[documentId];
                }
                return next;
            });
            applyIconToCachedLists(documentId, previousEmoji);
        }
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
        const targetId = emojiPickerState.documentId;
        setEmojiPickerState(null);
        void updateDocumentIcon(targetId, emojiData.emoji);
    };

    const handleEmojiReset = () => {
        if (!emojiPickerState) return;
        const targetId = emojiPickerState.documentId;
        setEmojiPickerState(null);
        void updateDocumentIcon(targetId, null);
    };

    const handleNewDocument = useCallback(async () => {
        try {
            await createDocument();
        } catch {
            // Error feedback handled by useDocumentActions
        }
    }, [createDocument]);

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
                        <button
                            type="button"
                            onClick={handleNewDocument}
                            className="flex h-4 w-4 items-center justify-center rounded-md opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 peer-hover:opacity-100 peer-focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Create document"
                            disabled={createDocumentPending}
                        >
                            {createDocumentPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Plus className="h-3 w-3" />
                            )}
                        </button>
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
                                          const serverEmoji = extractIconEmoji(
                                              document.metadata
                                          );
                                          const documentEmoji =
                                              documentEmojis[document.id] ??
                                              serverEmoji ??
                                              null;
                                          const displayEmoji =
                                              documentEmoji ??
                                              DEFAULT_DOCUMENT_EMOJI;

                                          return (
                                              <SidebarMenuItem
                                                  key={document.id}
                                              >
                                                  {editingDocumentId ===
                                                  document.id ? (
                                                      <div className="flex items-center gap-2 px-2 py-1.5">
                                                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-base">
                                                              {displayEmoji}
                                                          </span>
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
                                                                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-base">
                                                                          {
                                                                              displayEmoji
                                                                          }
                                                                      </span>
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
                                {!isListLoading && hasNextPage && (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="text-xs text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                                        >
                                            {isFetchingNextPage
                                                ? 'Loading...'
                                                : 'Load more'}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
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
                            autoFocusSearch={false}
                            lazyLoadEmojis
                            searchDisabled
                            skinTonesDisabled
                            width={PICKER_WIDTH}
                            height={PICKER_HEIGHT - 80}
                            previewConfig={{ showPreview: false }}
                        />
                        <div className="flex items-center justify-end border-t px-4 py-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleEmojiReset}
                            >
                                Use default
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

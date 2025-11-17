'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/prose/state';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
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
    TagEditingDialog,
    type TagDraft,
    type TagOption,
} from '@/components/document-editor/tag-editing-dialog';
import { DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import { useDocumentHeader } from '@/components/document/document-header-context';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

// import { EditorHeader } from '@/components/document-editor/editor-header';
import {
    remindNodeSchema,
    remindBracketInputRule,
    remindSlashInputRule,
    remindDomView,
    remindAutoParseProse,
    removeEmptyRemindProse,
    remindBackspaceDeleteProse,
    createRemindShortcodeRegex,
    parseRemindShortcodeMatch,
} from '@/components/document-editor/milkdown-remind';
import '@/components/document-editor/remind.css';
import type { RemindStatus } from '@/components/document-editor/remindNode';
import {
    useDocumentQuery,
    useDocumentTagsQuery,
    useWorkspaceTagsQuery,
    useDocumentRemindersQuery,
    type ApiTag,
} from '@/hooks/use-documents';
import { useDocumentActions } from '@/hooks/use-document-actions';
import type { GetDocumentDetailsResponseType } from '@search-hub/schemas';

type Document = {
    id: string;
    title: string;
    content: string | null;
    isFavorite: boolean;
    updatedAt: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const mapToTagOption = (tag: ApiTag): TagOption => ({
    id: tag.id,
    name: tag.name,
    color: tag.color ?? DEFAULT_TAG_COLOR,
    description: tag.description ?? undefined,
});

const mergeTagOptions = (...groups: TagOption[][]): TagOption[] => {
    const tagById = new Map<string, TagOption>();
    for (const group of groups) {
        for (const tag of group) {
            if (!tagById.has(tag.id)) {
                tagById.set(tag.id, tag);
            }
        }
    }
    return Array.from(tagById.values());
};

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { setData: setDocumentHeaderData } = useDocumentHeader();
    const documentId = params.id as string;
    const editorRootRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<Crepe | null>(null);
    const queryClient = useQueryClient();

    const [document, setDocument] = useState<Document | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showTagDialog, setShowTagDialog] = useState(false);
    const lastSavedContentRef = useRef<string>('');
    const isSavingRef = useRef(false);

    const {
        data: documentData,
        isLoading: isDocumentLoading,
        error: documentQueryError,
    } = useDocumentQuery(documentId);
    const { data: documentTagsData } = useDocumentTagsQuery(documentId);
    const { data: workspaceTagsData } = useWorkspaceTagsQuery();
    const { data: documentReminders } = useDocumentRemindersQuery(documentId, {
        refetchInterval: 60000, // Poll every 5 seconds for status updates
    });
    const {
        addTagToDocument,
        removeTagFromDocument,
        createTag: createWorkspaceTag,
        addTagPending,
        removeTagPending,
        createTagPending,
        createDocument,
    } = useDocumentActions();
    const isTagMutationPending = addTagPending || removeTagPending;

    useEffect(() => {
        if (!documentData) {
            return;
        }

        setDocument({
            id: documentData.id,
            title: documentData.title,
            content: documentData.content ?? null,
            isFavorite: documentData.isFavorite,
            updatedAt: documentData.updatedAt,
        });
        lastSavedContentRef.current = documentData.content ?? '';
        setError(null);
    }, [documentData]);

    useEffect(() => {
        if (documentQueryError) {
            setError(documentQueryError.message ?? 'Failed to load document');
        }
    }, [documentQueryError]);

    const documentTagOptions = useMemo(
        () => (documentTagsData ?? []).map(mapToTagOption),
        [documentTagsData]
    );
    const workspaceTagOptions = useMemo(
        () => (workspaceTagsData ?? []).map(mapToTagOption),
        [workspaceTagsData]
    );
    const availableTagOptions = useMemo(
        () => mergeTagOptions(workspaceTagOptions, documentTagOptions),
        [workspaceTagOptions, documentTagOptions]
    );

    // Save content to backend
    const saveContent = async (content: string) => {
        if (isSavingRef.current) {
            console.log('Save already in progress, skipping');
            return;
        }

        // Don't save if content hasn't changed
        if (content === lastSavedContentRef.current) {
            console.log('Content unchanged, skipping save');
            return;
        }

        try {
            isSavingRef.current = true;
            setSaveStatus('saving');

            const response = await fetch(
                `/api/documents/${documentId}/content`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content }),
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to save content');
            }

            const data = await response.json();
            if (!data?.document) {
                throw new Error('Invalid document payload');
            }
            const updatedDocument = {
                ...data.document,
                content: data.document.content ?? content,
            };
            lastSavedContentRef.current = content;
            setHasUnsavedChanges(false);
            setSaveStatus('saved');

            // Update local document state with new updatedAt
            setDocument((prev) =>
                prev
                    ? {
                          ...prev,
                          content: updatedDocument.content ?? content,
                          updatedAt: updatedDocument.updatedAt,
                      }
                    : null
            );
            queryClient.setQueryData<GetDocumentDetailsResponseType>(
                ['document', documentId],
                (prevData) => {
                    if (!prevData?.document) {
                        return { document: updatedDocument };
                    }
                    return {
                        ...prevData,
                        document: {
                            ...prevData.document,
                            ...updatedDocument,
                        },
                    };
                }
            );

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            console.error('Failed to save content:', error);
            setSaveStatus('error');
            toast.error('Failed to save', {
                description:
                    'Your changes could not be saved. Please try again.',
            });
        } finally {
            isSavingRef.current = false;
        }
    };

    // Debounced auto-save
    const debouncedSave = useDebouncedCallback(
        (content: string) => {
            console.log('Auto-saving content...');
            saveContent(content);
        },
        8000 // 8 seconds
    );

    // Queue reindex request
    const queueReindex = async (documentId: string) => {
        try {
            const response = await fetch(
                `/api/documents/${documentId}/reindex`,
                {
                    method: 'POST',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to queue re-indexing');
            }

            console.log('Re-indexing queued successfully');
        } catch (error) {
            console.error('Failed to queue re-indexing:', error);
        }
    };

    // Debounced auto re-index trigger (60 seconds after typing stops)
    const debouncedReindex = useDebouncedCallback(
        async () => {
            try {
                console.log('Triggering re-index for document...');
                queueReindex(documentId);
            } catch (error) {
                console.error('Failed to trigger re-index:', error);
            }
        },
        60000 // 60 seconds
    );

    const handleEditTags = useCallback(() => {
        setShowTagDialog(true);
    }, []);

    const handleTagRemove = async (tagId: string) => {
        removeTagFromDocument(documentId, tagId);
    };

    const handleTagAdd = async (tag: TagOption) => {
        const alreadyApplied = documentTagOptions.some(
            (existing) => existing.id === tag.id
        );
        if (alreadyApplied) {
            return;
        }
        addTagToDocument(documentId, tag);
    };

    const handleTagCreate = async (
        draft: TagDraft
    ): Promise<TagOption | null> => {
        const name = draft.name.trim();
        if (!name || createTagPending) {
            return null;
        }

        const existing = availableTagOptions.find(
            (tag) => tag.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
            await handleTagAdd(existing);
            return existing;
        }

        try {
            const result = await createWorkspaceTag({
                name,
                color: draft.color?.trim() || DEFAULT_TAG_COLOR,
                description: draft.description?.trim() || undefined,
            });
            const createdTag = result?.tag as ApiTag | undefined;
            if (!createdTag) {
                return null;
            }
            const createdTagOption = mapToTagOption(createdTag);
            await handleTagAdd(createdTagOption);
            return createdTagOption;
        } catch (error) {
            console.error('Failed to create tag:', error);
            toast.error('Failed to create tag', {
                description:
                    'We could not create the new tag. Please try again.',
            });
            return null;
        }
    };

    const handleDelete = useCallback(() => {
        setShowDeleteDialog(true);
    }, []);

    const handleDeleteConfirm = async () => {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            // Trigger event to refresh the sidebar
            window.dispatchEvent(
                new CustomEvent('documentDeleted', {
                    detail: { documentId },
                })
            );

            toast.success('Document deleted', {
                description: 'The document has been permanently deleted.',
            });

            // Fetch the most recent document
            const docsResponse = await fetch(
                '/api/documents?limit=1&offset=0',
                {
                    credentials: 'include',
                }
            );

            if (docsResponse.ok) {
                const data = await docsResponse.json();
                const documents = data.documents?.items || [];

                if (documents.length > 0) {
                    // Redirect to the most recent document
                    router.push(`/doc/${documents[0].id}`);
                } else {
                    // No documents left, create a fresh one
                    try {
                        await createDocument();
                    } catch {
                        router.push('/dashboard');
                    }
                }
            } else {
                // Fallback: try creating a fresh document
                try {
                    await createDocument();
                } catch {
                    router.push('/dashboard');
                }
            }
        } catch (error) {
            console.error('Failed to delete document:', error);
            toast.error('Failed to delete document', {
                description: 'An error occurred while deleting the document.',
            });
        } finally {
            setShowDeleteDialog(false);
        }
    };

    // Handle content changes from editor
    const handleContentChange = (content: string) => {
        if (content !== lastSavedContentRef.current) {
            setHasUnsavedChanges(true);
            debouncedSave(content);
            debouncedReindex(); // Separate 60s timer for reindex
        }
    };

    // Manual save handler (Cmd/Ctrl+S)
    const handleManualSave = async () => {
        if (!editorInstanceRef.current) return;

        // Cancel pending debounced save
        debouncedSave.cancel();

        // Get current content from editor and save immediately
        const content = editorInstanceRef.current.getMarkdown();
        await saveContent(content);

        // Note: Manual save does NOT trigger reindex
        // Reindex only happens via the 60s debounced timer
    };

    const getSaveStatusLabel = useCallback(() => {
        if (!document) return 'Loading...';

        switch (saveStatus) {
            case 'saving':
                return 'Saving...';
            case 'saved':
                return 'Saved';
            case 'error':
                return 'Failed to save';
            case 'idle':
            default:
                if (hasUnsavedChanges) {
                    return 'Unsaved changes';
                }
                return `Updated ${new Date(
                    document.updatedAt
                ).toLocaleString()}`;
        }
    }, [document, saveStatus, hasUnsavedChanges]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault(); // Prevent browser save dialog
                handleManualSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // handleManualSave uses refs, so it's stable

    // Cleanup: cancel pending saves and reindex on unmount
    useEffect(() => {
        return () => {
            debouncedSave.cancel();
            debouncedReindex.cancel();
        };
    }, [debouncedSave, debouncedReindex]);

    useEffect(() => {
        if (!document) {
            return;
        }
        setDocumentHeaderData((prev) => ({
            ...(prev ?? {}),
            documentId,
            title: document.title ?? 'Untitled document',
            isFavorited: document.isFavorite,
            tags: documentTagOptions,
            updatedAt: document.updatedAt,
            statusLabel: getSaveStatusLabel(),
            onEditTags: handleEditTags,
            onDeleteDocument: handleDelete,
        }));
    }, [
        document,
        documentId,
        documentTagOptions,
        setDocumentHeaderData,
        getSaveStatusLabel,
        handleEditTags,
        handleDelete,
    ]);

    // Create Crepe editor when document is loaded
    useEffect(() => {
        if (!document || !editorRootRef.current || editorInstanceRef.current) {
            return;
        }

        // Store the content at the time of editor creation
        const contentToLoad = document.content || '';

        const createEditor = async () => {
            const editorStartTime = performance.now();
            console.log('[Perf] Starting editor initialization');

            const container = editorRootRef.current!;

            // Clear container
            container.innerHTML = '';

            const editor = new Crepe({
                root: container,
                defaultValue: contentToLoad,
                featureConfigs: {
                    [Crepe.Feature.Placeholder]: {
                        text: 'Start writing...',
                    },
                    [Crepe.Feature.BlockEdit]: {
                        buildMenu: (builder) => {
                            const { addItem } = builder.addGroup(
                                'inline-actions',
                                'Inline actions'
                            );
                            addItem('remind', {
                                label: 'Remind',
                                icon: '⏰',
                                onRun: (ctx) => {
                                    try {
                                        const view = ctx.get(editorViewCtx);
                                        const { schema } = view.state;
                                        const state = view.state;
                                        const remindType = schema.nodes.remind;

                                        if (!remindType) {
                                            console.warn(
                                                'Remind node type not found in schema'
                                            );
                                            return;
                                        }

                                        const attrs = {
                                            kind: 'remind',
                                            whenText: '',
                                            id: `r_${Date.now().toString(
                                                36
                                            )}_${Math.random()
                                                .toString(36)
                                                .slice(2, 8)}`,
                                        };
                                        const content = schema.text('\u00A0');
                                        const node = remindType.create(
                                            attrs,
                                            content
                                        );

                                        const pos = state.selection.from;
                                        const $pos = state.doc.resolve(pos);

                                        // Find current textblock start
                                        let blockStart = 0;
                                        for (let d = $pos.depth; d >= 0; d--) {
                                            const parent = $pos.node(d);
                                            if (parent.isTextblock) {
                                                blockStart = $pos.start(d);
                                                break;
                                            }
                                        }

                                        const before = state.doc.textBetween(
                                            blockStart,
                                            pos,
                                            '\n',
                                            '\n'
                                        );

                                        // Detect a trailing "/keyword" to replace
                                        let insertFrom = pos;
                                        const lastSlash =
                                            before.lastIndexOf('/');
                                        if (lastSlash >= 0) {
                                            const candidate =
                                                before.slice(lastSlash);
                                            if (
                                                /^\/[A-Za-z0-9_-]*$/.test(
                                                    candidate
                                                )
                                            ) {
                                                insertFrom =
                                                    blockStart + lastSlash;
                                            }
                                        }

                                        let tr = state.tr.replaceWith(
                                            insertFrom,
                                            pos,
                                            node
                                        );
                                        tr = tr.setSelection(
                                            TextSelection.create(
                                                tr.doc,
                                                insertFrom + 1
                                            )
                                        );
                                        view.dispatch(tr.scrollIntoView());
                                        view.focus();
                                    } catch (e) {
                                        console.warn('Slash Remind failed:', e);
                                    }
                                },
                            });
                        },
                    },
                },
            });

            // Add remind plugins to the underlying Milkdown editor
            await editor.editor
                .use(remindNodeSchema)
                .use(remindBracketInputRule)
                .use(remindSlashInputRule)
                .use(remindDomView)
                .use(remindAutoParseProse)
                .use(removeEmptyRemindProse)
                .use(remindBackspaceDeleteProse);

            const createStart = performance.now();
            await editor.create();
            const createEnd = performance.now();
            console.log(
                `[Perf] Editor.create() took: ${(
                    createEnd - createStart
                ).toFixed(2)}ms`
            );

            editorInstanceRef.current = editor;

            // Listen for content changes to trigger auto-save
            // Use ProseMirror's transaction listener
            const view = editor.editor.ctx.get(editorViewCtx);

            const hydrateSavedReminds = () => {
                const remindType = view.state.schema.nodes.remind;
                if (!remindType) {
                    return;
                }

                // Collect all replacements first, then apply in reverse order
                const replacements: Array<{
                    from: number;
                    to: number;
                    node: any;
                }> = [];

                view.state.doc.descendants((node, pos) => {
                    if (!node.isBlock) {
                        return true;
                    }

                    node.forEach((child, offset) => {
                        if (child.type.name !== 'text') {
                            return;
                        }

                        const text = child.text ?? '';
                        const regex = createRemindShortcodeRegex();
                        const matches: RegExpExecArray[] = [];
                        let match: RegExpExecArray | null;
                        while ((match = regex.exec(text)) !== null) {
                            matches.push(match);
                        }

                        if (!matches.length) {
                            return;
                        }

                        for (const currentMatch of matches) {
                            const { whenText, attrs } =
                                parseRemindShortcodeMatch(currentMatch);
                            const basePos = pos + 1 + offset;
                            const from = basePos + currentMatch.index;
                            const to = from + currentMatch[0].length;
                            const content =
                                whenText && whenText.length > 0
                                    ? view.state.schema.text(whenText)
                                    : view.state.schema.text('\u00A0');
                            const remindNodeInstance = remindType.create(
                                {
                                    kind: 'remind',
                                    whenText,
                                    whenISO:
                                        (attrs.whenISO as string | undefined) ??
                                        null,
                                    status:
                                        (attrs.status as
                                            | RemindStatus
                                            | undefined) ?? 'scheduled',
                                    id:
                                        (attrs.id as string | undefined) ??
                                        `r_${Date.now().toString(
                                            36
                                        )}_${Math.random()
                                            .toString(36)
                                            .slice(2, 8)}`,
                                },
                                content
                            );
                            replacements.push({
                                from,
                                to,
                                node: remindNodeInstance,
                            });
                        }
                    });

                    return true;
                });

                // Apply replacements in reverse order to maintain valid positions
                if (replacements.length > 0) {
                    let tr = view.state.tr;
                    // Sort by position (descending) to process from end to start
                    replacements.sort((a, b) => b.from - a.from);
                    for (const { from, to, node } of replacements) {
                        tr = tr.replaceRangeWith(from, to, node);
                    }
                    view.dispatch(tr);
                }
            };

            hydrateSavedReminds();
            let previousContent = editor.getMarkdown();

            const originalDispatch = view.dispatch.bind(view);
            view.dispatch = (tr) => {
                originalDispatch(tr);

                // Check if document actually changed
                if (tr.docChanged) {
                    const currentContent = editor.getMarkdown();
                    if (currentContent !== previousContent) {
                        previousContent = currentContent;
                        handleContentChange(currentContent);
                    }
                }
            };

            const totalEditorTime = performance.now() - editorStartTime;
            console.log(
                `[Perf] Total editor initialization took: ${totalEditorTime.toFixed(
                    2
                )}ms`
            );
        };

        createEditor().catch(console.error);

        // Cleanup
        return () => {
            if (editorInstanceRef.current) {
                editorInstanceRef.current.destroy();
                editorInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [document?.id]); // Only recreate editor when document loads or ID changes, not on title/updatedAt changes

    // Update reminder statuses when they change in the database
    useEffect(() => {
        if (!editorInstanceRef.current || !documentReminders) {
            return;
        }

        const editor = editorInstanceRef.current;
        const view = editor.editor.ctx.get(editorViewCtx);

        // Build a map of reminderId -> status
        const statusMap = new Map<string, RemindStatus>();
        for (const reminder of documentReminders) {
            if (reminder.reminderId) {
                statusMap.set(
                    reminder.reminderId,
                    reminder.status as RemindStatus
                );
            }
        }

        // Update all remind nodes that have changed status
        let tr = view.state.tr;
        let hasChanges = false;

        view.state.doc.descendants((node, pos) => {
            if (node.type.name === 'remind') {
                const nodeId = node.attrs.id as string | undefined;
                if (nodeId && statusMap.has(nodeId)) {
                    const newStatus = statusMap.get(nodeId);
                    const currentStatus = node.attrs.status as
                        | RemindStatus
                        | undefined;

                    if (newStatus !== currentStatus) {
                        const newAttrs = {
                            ...node.attrs,
                            status: newStatus,
                        };
                        tr = tr.setNodeMarkup(pos, undefined, newAttrs);
                        hasChanges = true;
                    }
                }
            }
        });

        if (hasChanges) {
            view.dispatch(tr);
        }
    }, [documentReminders]);

    const isLoading =
        (isDocumentLoading && !document) || !documentData || !document;

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-medium">
                        {error || 'Document not found'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-1 flex-col bg-card">
                <div
                    ref={editorRootRef}
                    className="crepe theme-frame h-full min-h-[560px] w-full bg-card"
                />
            </div>

            <TagEditingDialog
                open={showTagDialog}
                onOpenChange={setShowTagDialog}
                documentTitle={document.title}
                documentTags={documentTagOptions}
                availableTags={availableTagOptions}
                onAddTag={handleTagAdd}
                onRemoveTag={handleTagRemove}
                onCreateTag={handleTagCreate}
                isCreatingTag={createTagPending}
                isTagMutationPending={isTagMutationPending}
            />

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete &quot;{document.title}&quot; and all of its
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
    );
}

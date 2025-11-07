'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/prose/state';
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
    EditorHeaderTagEditing,
    type TagDraft,
    type TagOption,
} from '@/components/document-editor/editor-header-tag-editing';
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

type Document = {
    id: string;
    title: string;
    content: string | null;
    isFavorite: boolean;
    updatedAt: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type ApiTag = {
    id: string;
    name: string;
    color?: string | null;
    description?: string | null;
};

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

const fetchTagsForDocument = async (
    documentId: string
): Promise<{ documentTags: TagOption[]; availableTags: TagOption[] }> => {
    try {
        const [documentTagsResponse, workspaceTagsResponse] = await Promise.all(
            [
                fetch(`/api/documents/${documentId}/tags`, {
                    credentials: 'include',
                }),
                fetch('/api/tags', {
                    credentials: 'include',
                }),
            ]
        );

        let documentTagOptions: TagOption[] = [];

        if (documentTagsResponse.ok) {
            const data = (await documentTagsResponse.json()) as {
                tags?: ApiTag[];
            };
            documentTagOptions = (data.tags ?? []).map(mapToTagOption);
        } else {
            const reason = await documentTagsResponse.text();
            console.error(
                'Failed to fetch document tags:',
                documentTagsResponse.status,
                reason
            );
        }

        let availableTagOptions = documentTagOptions;

        if (workspaceTagsResponse.ok) {
            const data = (await workspaceTagsResponse.json()) as {
                tags?: ApiTag[];
            };
            const workspaceTagOptions = (data.tags ?? []).map(mapToTagOption);
            availableTagOptions = mergeTagOptions(
                workspaceTagOptions,
                documentTagOptions
            );
        } else {
            const reason = await workspaceTagsResponse.text();
            console.error(
                'Failed to fetch available tags:',
                workspaceTagsResponse.status,
                reason
            );
        }

        return {
            documentTags: documentTagOptions,
            availableTags: availableTagOptions,
        };
    } catch (error) {
        console.error('Failed to fetch tags:', error);
        return { documentTags: [], availableTags: [] };
    }
};

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { data: session } = useSession();
    const { setData: setDocumentHeaderData } = useDocumentHeader();
    const documentId = params.id as string;
    const editorRootRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<Crepe | null>(null);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
    const [documentTags, setDocumentTags] = useState<TagOption[]>([]);
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [loadTiming, setLoadTiming] = useState<{
        frontend: number;
        backend: number;
        total: number;
    } | null>(null);
    const lastSavedContentRef = useRef<string>('');
    const isSavingRef = useRef(false);

    useEffect(() => {
        if (!documentId) {
            return;
        }

        let isCancelled = false;

        const fetchDocumentAndTags = async () => {
            setIsLoading(true);
            setError(null);
            const startTime = performance.now();

            try {
                const documentPromise = fetch(`/api/documents/${documentId}`, {
                    credentials: 'include',
                });

                const tagsPromise = fetchTagsForDocument(documentId);

                const [response, tagData] = await Promise.all([
                    documentPromise,
                    tagsPromise,
                ]);

                if (!response.ok) {
                    const reason = await response.text();
                    throw new Error(reason || 'Failed to fetch document');
                }

                const data = await response.json();
                const doc = data.document || data;

                if (isCancelled) {
                    return;
                }

                const totalTime = performance.now() - startTime;
                const backendTime = parseFloat(
                    response.headers.get('X-Backend-Time') || '0'
                );
                const apiRouteTime = parseFloat(
                    response.headers.get('X-Total-Time') || '0'
                );
                const frontendTime = totalTime - apiRouteTime;

                if (process.env.NODE_ENV === 'development') {
                    setLoadTiming({
                        frontend: frontendTime,
                        backend: backendTime,
                        total: totalTime,
                    });
                }

                setDocument(doc);
                lastSavedContentRef.current = doc.content || '';
                setDocumentTags(tagData.documentTags);
                setAvailableTags(tagData.availableTags);
            } catch (err) {
                if (!isCancelled) {
                    console.error('Failed to fetch document:', err);
                    setError('Failed to load document');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchDocumentAndTags();

        return () => {
            isCancelled = true;
        };
    }, [documentId]);

    const handleTitleChange = async (newTitle: string) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/title`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle }),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to update title');
            }

            const data = await response.json();

            // Update local state with new title and server's updated timestamp
            setDocument((prev) =>
                prev
                    ? {
                          ...prev,
                          title: data.document.title,
                          updatedAt: new Date().toISOString(), // Use current timestamp for immediate feedback
                      }
                    : null
            );

            // Trigger custom event to refresh only this document in sidebar
            window.dispatchEvent(
                new CustomEvent('documentUpdated', {
                    detail: { documentId, title: newTitle },
                })
            );
        } catch (error) {
            console.error('Failed to update title:', error);
            toast.error('Failed to update title', {
                description: 'Your title change could not be saved.',
            });
            throw error;
        }
    };

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
            lastSavedContentRef.current = content;
            setHasUnsavedChanges(false);
            setSaveStatus('saved');

            // Update local document state with new updatedAt
            setDocument((prev) =>
                prev
                    ? {
                          ...prev,
                          content,
                          updatedAt: data.document.updatedAt,
                      }
                    : null
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
        const removedIndex = documentTags.findIndex((tag) => tag.id === tagId);
        if (removedIndex < 0) {
            return;
        }
        const removedTag = documentTags[removedIndex];

        setDocumentTags((prev) => prev.filter((tag) => tag.id !== tagId));

        try {
            const response = await fetch(
                `/api/documents/${documentId}/tags/${tagId}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                const reason = await response.text();
                throw new Error(
                    reason || `Failed with status ${response.status}`
                );
            }

            setAvailableTags((prev) =>
                prev.some((tag) => tag.id === removedTag.id)
                    ? prev
                    : [...prev, removedTag]
            );
        } catch (error) {
            console.error('Failed to remove tag:', error);
            setDocumentTags((prev) => {
                const next = [...prev];
                const insertAt =
                    removedIndex <= next.length ? removedIndex : next.length;
                next.splice(insertAt, 0, removedTag);
                return next;
            });
            toast.error('Failed to remove tag', {
                description: 'The tag could not be removed from the document.',
            });
        }
    };

    const handleTagAdd = async (tag: TagOption) => {
        const alreadyApplied = documentTags.some(
            (existing) => existing.id === tag.id
        );
        if (alreadyApplied) {
            return;
        }

        setDocumentTags((prev) => [...prev, tag]);
        setAvailableTags((prev) =>
            prev.some((existing) => existing.id === tag.id)
                ? prev
                : [...prev, tag]
        );

        try {
            const response = await fetch(`/api/documents/${documentId}/tags`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ tagIds: [tag.id] }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const reason = await response.text();
                throw new Error(
                    reason || `Failed with status ${response.status}`
                );
            }
        } catch (error) {
            console.error('Failed to add tag:', error);
            setDocumentTags((prev) =>
                prev.filter((existing) => existing.id !== tag.id)
            );
            toast.error('Failed to add tag', {
                description: 'The tag could not be added to the document.',
            });
        }
    };

    const handleTagCreate = async (
        draft: TagDraft
    ): Promise<TagOption | null> => {
        const name = draft.name.trim();
        if (!name || isCreatingTag) {
            return null;
        }

        const existing = availableTags.find(
            (tag) => tag.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
            await handleTagAdd(existing);
            return existing;
        }

        const payload = {
            name,
            color: draft.color?.trim() || DEFAULT_TAG_COLOR,
            description: draft.description?.trim() || undefined,
        };

        setIsCreatingTag(true);

        try {
            const response = await fetch('/api/tags', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const reason = await response.text();
                throw new Error(
                    reason || `Failed with status ${response.status}`
                );
            }

            const data = (await response.json()) as { tag?: ApiTag };
            if (!data.tag) {
                throw new Error('Malformed response when creating tag');
            }

            const createdTag = mapToTagOption(data.tag);
            await handleTagAdd(createdTag);
            return createdTag;
        } catch (error) {
            console.error('Failed to create tag:', error);
            toast.error('Failed to create tag', {
                description:
                    'We could not create the new tag. Please try again.',
            });
            return null;
        } finally {
            setIsCreatingTag(false);
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
                    // No documents, redirect to new document page
                    router.push('/dashboard/new');
                }
            } else {
                // Fallback to new document page if fetch fails
                router.push('/dashboard/new');
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
            tags: documentTags,
            updatedAt: document.updatedAt,
            statusLabel: getSaveStatusLabel(),
            onEditTags: handleEditTags,
            onDeleteDocument: handleDelete,
        }));
    }, [
        document,
        documentId,
        documentTags,
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

                let tr = view.state.tr;
                let changed = false;

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

                        for (let idx = matches.length - 1; idx >= 0; idx -= 1) {
                            const currentMatch = matches[idx];
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
                                        (attrs.status as RemindStatus | undefined) ??
                                        'scheduled',
                                    id:
                                        (attrs.id as string | undefined) ??
                                        `r_${Date.now().toString(36)}_${Math.random()
                                            .toString(36)
                                            .slice(2, 8)}`,
                                },
                                content
                            );
                            tr = tr.replaceRangeWith(
                                from,
                                to,
                                remindNodeInstance
                            );
                            changed = true;
                        }
                    });

                    return true;
                });

                if (changed) {
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

    const activeMembership = session?.user?.memberships?.find(
        (membership) => membership.tenantId === session?.activeTenantId
    );
    const canManageDocument =
        !!activeMembership &&
        (activeMembership.role === 'owner' ||
            activeMembership.role === 'admin');

    return (
        <>
            <div className="flex flex-1 flex-col bg-card">
                {/* <EditorHeader
                    title={document.title}
                    lastSavedLabel={getSaveStatusLabel()}
                    isFavorited={document.isFavorite}
                    onTitleChange={handleTitleChange}
                    onEditTags={handleEditTags}
                    canManageDocument={canManageDocument}
                    documentTags={documentTags}
                    onDelete={handleDelete}
                /> */}
                <div
                    ref={editorRootRef}
                    className="crepe theme-frame h-full min-h-[560px] w-full bg-card"
                />
                {loadTiming && process.env.NODE_ENV === 'development' && (
                    <div className="border-t bg-muted/30 px-4 py-1 text-xs text-muted-foreground">
                        <span className="font-mono">
                            Load: {loadTiming.total.toFixed(0)}ms (Frontend:{' '}
                            {loadTiming.frontend.toFixed(0)}ms, Backend:{' '}
                            {loadTiming.backend.toFixed(0)}ms)
                        </span>
                    </div>
                )}
            </div>

            <EditorHeaderTagEditing
                open={showTagDialog}
                onOpenChange={setShowTagDialog}
                documentTitle={document.title}
                documentTags={documentTags}
                availableTags={availableTags}
                onAddTag={handleTagAdd}
                onRemoveTag={handleTagRemove}
                onCreateTag={handleTagCreate}
                isCreatingTag={isCreatingTag}
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

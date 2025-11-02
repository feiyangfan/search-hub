'use client';

import { useEffect, useState, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useParams, useRouter } from 'next/navigation';
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
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import { EditorHeader } from '@/components/document-editor/editor-header';
import {
    remindNodeSchema,
    remindBracketInputRule,
    remindSlashInputRule,
    remindDomView,
    remindAutoParseProse,
    removeEmptyRemindProse,
    remindBackspaceDeleteProse,
} from '@/components/document-editor/milkdown-remind';
import '@/components/document-editor/remind.css';

type Document = {
    id: string;
    title: string;
    content: string | null;
    isFavorite: boolean;
    updatedAt: string;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const documentId = params.id as string;
    const editorRootRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<Crepe | null>(null);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const lastSavedContentRef = useRef<string>('');
    const isSavingRef = useRef(false);

    useEffect(() => {
        async function fetchDocument() {
            try {
                const response = await fetch(`/api/documents/${documentId}`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch document');
                }

                const data = await response.json();
                const doc = data.document || data;
                setDocument(doc);
                lastSavedContentRef.current = doc.content || '';
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to fetch document:', err);
                setError('Failed to load document');
                setIsLoading(false);
            }
        }

        fetchDocument();
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

    // Placeholder handlers
    const handleEditTags = () => {
        console.log('Edit tags clicked - TODO: implement tags editor');
        toast.info('Edit tags', {
            description: 'Tags editor coming soon!',
        });
    };

    const handleDelete = () => {
        setShowDeleteDialog(true);
    };

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

    // Create Crepe editor when document is loaded
    useEffect(() => {
        if (!document || !editorRootRef.current || editorInstanceRef.current) {
            return;
        }

        // Store the content at the time of editor creation
        const contentToLoad = document.content || '';

        const createEditor = async () => {
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

            await editor.create();

            editorInstanceRef.current = editor;

            // Listen for content changes to trigger auto-save
            // Use ProseMirror's transaction listener
            const view = editor.editor.ctx.get(editorViewCtx);
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

    // Generate save status label
    const getSaveStatusLabel = () => {
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
    };

    return (
        <>
            <div className="flex flex-1 flex-col">
                <EditorHeader
                    title={document.title}
                    lastSavedLabel={getSaveStatusLabel()}
                    isFavorited={document.isFavorite}
                    onTitleChange={handleTitleChange}
                    onEditTags={handleEditTags}
                    onDelete={handleDelete}
                />
                <div
                    ref={editorRootRef}
                    className="crepe theme-frame h-full min-h-[560px] w-full"
                />
            </div>

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

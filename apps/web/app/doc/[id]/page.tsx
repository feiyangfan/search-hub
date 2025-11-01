'use client';

import { useEffect, useState, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/prose/state';
import { useToast } from '@/components/ui/use-toast';
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

export default function DocumentPage() {
    const params = useParams();
    const { toast } = useToast();
    const documentId = params.id as string;
    const editorRootRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<Crepe | null>(null);

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                setDocument(data.document || data);
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
            const response = await fetch(`/api/documents/${documentId}`, {
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
            const now = new Date().toISOString();

            // Update local state with new title and updated timestamp
            setDocument((prev) =>
                prev ? { ...prev, title: newTitle, updatedAt: now } : null
            );

            // Trigger custom event to refresh only this document in sidebar
            window.dispatchEvent(
                new CustomEvent('documentUpdated', {
                    detail: { documentId, title: newTitle },
                })
            );
        } catch (error) {
            console.error('Failed to update title:', error);
            throw error;
        }
    };

    const handleManualSave = async () => {};

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault(); // Prevent browser save dialog
                handleManualSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [documentId]);

    // Create Crepe editor when document is loaded
    useEffect(() => {
        if (!document || !editorRootRef.current || editorInstanceRef.current) {
            return;
        }

        const createEditor = async () => {
            const container = editorRootRef.current!;
            console.log('Creating Crepe editor directly in page');

            // Clear container
            container.innerHTML = '';

            const editor = new Crepe({
                root: container,
                defaultValue: document.content || '',
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

            console.log(
                'Crepe editor created in page with remind functionality'
            );
        };

        createEditor().catch(console.error);

        // Cleanup
        return () => {
            console.log('Page editor cleanup');
            if (editorInstanceRef.current) {
                editorInstanceRef.current.destroy();
                editorInstanceRef.current = null;
            }
        };
    }, [document]); // Depend on document so editor is created after document loads

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
        <div className="flex flex-1 flex-col">
            <EditorHeader
                title={document.title}
                lastSavedLabel={`Updated ${new Date(
                    document.updatedAt
                ).toLocaleString()}`}
                isFavorited={document.isFavorite}
                onTitleChange={handleTitleChange}
            />
            <div
                ref={editorRootRef}
                className="crepe theme-frame h-full min-h-[560px] w-full"
            />
        </div>
    );
}

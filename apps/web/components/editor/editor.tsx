'use client';

import * as React from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown as markdownExtension } from '@codemirror/lang-markdown';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { githubLight } from '@fsegurai/codemirror-theme-bundle';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { replaceAll } from '@milkdown/kit/utils';
import { TextSelection, Selection } from '@milkdown/prose/state';
import type { Node as PMNode, Schema as PMSchema } from 'prosemirror-model';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

export type ViewMode = 'wysiwyg' | 'markdown';

export type CrepeMarkdownEditorHandle = {
    toggleView: () => void;
    getViewMode: () => ViewMode;
    getMarkdown: () => Promise<string | undefined>;
    insertRemind?: (whenText?: string) => void;
    getReminders?: () => Array<{
        from: number;
        to: number;
        whenText: string;
        whenISO: string | null;
        status: 'scheduled' | 'overdue' | 'done';
    }>;
    jumpTo?: (pos: number) => void;
};

export type CrepeMarkdownEditorProps = {
    initialMarkdown: string;
    onMarkdownChange?: (markdown: string) => void;
    onViewModeChange?: (mode: ViewMode) => void;
    className?: string;
    configureEditor?: (editor: Crepe) => Promise<void> | void;
    onRemindersChange?: (
        reminders: Array<{
            from: number;
            to: number;
            whenText: string;
            whenISO: string | null;
            status: 'scheduled' | 'overdue' | 'done';
        }>
    ) => void;
};

const MIN_MARKDOWN_EDITOR_HEIGHT = 560;

const markdownBaseTheme = EditorView.theme(
    {
        '.cm-editor': {
            backgroundColor: 'transparent',
            minHeight: `${MIN_MARKDOWN_EDITOR_HEIGHT}px`,
            outline: 'none',
        },
        '.cm-scroller': {
            fontFamily:
                'var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace)',
            lineHeight: '1.6',
            wordBreak: 'break-word',
            overflow: 'hidden',
        },
        '.cm-content': {
            whiteSpace: 'pre-wrap',
            padding: 0,
        },
        '.cm-line': {
            paddingLeft: 0,
            paddingRight: 0,
        },
    },
    { dark: false }
);

const markdownFocusReset = EditorView.theme(
    {
        '.cm-editor.cm-focused': {
            boxShadow: 'none !important',
            border: 'none !important',
        },
        '.cm-editor.cm-focused .cm-scroller': {
            boxShadow: 'none !important',
        },
    },
    { dark: false }
);

const markdownAutoHeight = EditorView.updateListener.of((update) => {
    const editorDom = update.view.dom as HTMLElement;
    const contentHeight = update.view.contentHeight;
    const nextHeight = Math.max(contentHeight, MIN_MARKDOWN_EDITOR_HEIGHT);
    if (
        !update.docChanged &&
        !update.viewportChanged &&
        editorDom.style.height
    ) {
        return;
    }
    if (editorDom.style.height === `${nextHeight}px`) {
        return;
    }
    editorDom.style.height = `${nextHeight}px`;
});

const baseMarkdownExtensions = [
    markdownExtension(),
    EditorView.lineWrapping,
    markdownBaseTheme,
    githubLight,
    markdownFocusReset,
    markdownAutoHeight,
];

export const CrepeMarkdownEditor = React.forwardRef<
    CrepeMarkdownEditorHandle,
    CrepeMarkdownEditorProps
>(function CrepeMarkdownEditor(
    {
        initialMarkdown,
        onMarkdownChange,
        onViewModeChange,
        className,
        configureEditor,
        onRemindersChange,
    },
    ref
) {
    const editorRootRef = React.useRef<HTMLDivElement | null>(null);
    const editorInstanceRef = React.useRef<Crepe | null>(null);
    const codeMirrorRef = React.useRef<ReactCodeMirrorRef | null>(null);

    const milkdownSelectionRef = React.useRef<{
        from: number;
        to: number;
    } | null>(null);
    const markdownSelectionRef = React.useRef<{
        from: number;
        to: number;
    } | null>(null);
    const pendingScrollYRef = React.useRef<number | null>(null);
    const markdownDirtyRef = React.useRef(false);
    const lastSyncedMarkdownRef = React.useRef<string>(initialMarkdown);

    const [viewMode, setViewMode] = React.useState<ViewMode>('wysiwyg');
    const [markdownSource, setMarkdownSource] =
        React.useState<string>(initialMarkdown);

    const readBadges = React.useCallback(() => {}, []);

    const readReminders = React.useCallback(() => {
        const out: Array<{
            from: number;
            to: number;
            whenText: string;
            whenISO: string | null;
            status: 'scheduled' | 'overdue' | 'done';
        }> = [];
        const instance = editorInstanceRef.current;
        if (!instance) return out;
        try {
            instance.editor.action((ctx) => {
                const view = ctx.get(editorViewCtx);
                view.state.doc.descendants((node: PMNode, pos: number) => {
                    if (node?.type?.name === 'remind') {
                        const attrs = node.attrs as Record<string, unknown>;
                        out.push({
                            from: pos,
                            to: pos + node.nodeSize,
                            whenText:
                                (attrs['whenText'] as string) ||
                                node.textContent?.toString() ||
                                '',
                            whenISO:
                                (attrs['whenISO'] as string | null) ?? null,
                            status: ((attrs['status'] as
                                | 'scheduled'
                                | 'overdue'
                                | 'done') || 'scheduled') as
                                | 'scheduled'
                                | 'overdue'
                                | 'done',
                        });
                    }
                });
            });
        } catch {}
        return out;
    }, []);

    // expose imperative API
    React.useImperativeHandle(
        ref,
        (): CrepeMarkdownEditorHandle => ({
            toggleView: () => handleToggleView(),
            getViewMode: () => viewMode,
            getMarkdown: async () => editorInstanceRef.current?.getMarkdown(),
            insertRemind: (whenText = '') => {
                const instance = editorInstanceRef.current;
                if (!instance) return;
                instance.editor.action((ctx) => {
                    const view = ctx.get(editorViewCtx);
                    const { schema } = view.state;
                    const remindType = (schema as PMSchema).nodes?.remind;
                    if (!remindType) return;
                    const from = view.state.selection.from;
                    const node = remindType.create(
                        { kind: 'remind', whenText },
                        whenText ? schema.text(whenText) : schema.text('\u00A0')
                    );
                    let tr = view.state.tr.replaceSelectionWith(node, false);
                    // place cursor inside the remind content so user can type immediately
                    tr = tr.setSelection(
                        TextSelection.create(tr.doc, from + 1)
                    );
                    view.dispatch(tr.scrollIntoView());
                    view.focus();
                });
                onRemindersChange?.(readReminders());
            },
            getReminders: () => readReminders(),
            jumpTo: (pos: number) => {
                const instance = editorInstanceRef.current;
                if (!instance) return;
                instance.editor.action((ctx) => {
                    const view = ctx.get(editorViewCtx);
                    const { doc } = view.state;
                    const target = Math.max(
                        1,
                        Math.min(pos, doc.content.size - 1)
                    );
                    let tr = view.state.tr;
                    try {
                        const sel = TextSelection.create(doc, target);
                        tr = tr.setSelection(sel).scrollIntoView();
                    } catch {
                        try {
                            const $pos = doc.resolve(target);
                            const sel = Selection.near($pos, -1);
                            tr = tr.setSelection(sel).scrollIntoView();
                        } catch {
                            tr = tr
                                .setSelection(Selection.atEnd(doc))
                                .scrollIntoView();
                        }
                    }
                    view.dispatch(tr);
                    view.focus();
                });
            },
        }),
        [viewMode, onRemindersChange, readReminders]
    );

    const createEditor = React.useCallback(async (content: string) => {
        if (!editorRootRef.current) return;

        if (editorInstanceRef.current) {
            await editorInstanceRef.current.destroy();
            editorInstanceRef.current = null;
        }

        editorRootRef.current.innerHTML = '';

        const editor = new Crepe({
            root: editorRootRef.current,
            defaultValue: content,
            featureConfigs: {
                [Crepe.Feature.Placeholder]: {
                    text: 'Start jotting ideas…',
                },
                // Add a custom slash menu item under BlockEdit to insert an inline remind pill
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
                                    const remindType = (schema as PMSchema)
                                        .nodes?.remind;
                                    if (!remindType) return;
                                    const whenText = '';
                                    const content = schema.text('\u00A0');
                                    const node = remindType.create(
                                        { kind: 'remind', whenText },
                                        content
                                    );

                                    const { state } = view;
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
                                    const lastSlash = before.lastIndexOf('/');
                                    if (lastSlash >= 0) {
                                        const candidate =
                                            before.slice(lastSlash);
                                        if (
                                            /^\/[A-Za-z0-9_-]*$/.test(candidate)
                                        ) {
                                            insertFrom = blockStart + lastSlash;
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

        if (configureEditor) {
            await configureEditor(editor);
        } else {
            await editor.create();
        }
        editorInstanceRef.current = editor;

        // After creation, run an initial rehydrate pass to convert any
        // [[remind: ...]] bracket markdown inside the document into remind nodes
        try {
            editor.editor.action((ctx) => {
                const view = ctx.get(editorViewCtx);
                const { schema, doc } = view.state;
                const remindType = (schema as PMSchema).nodes?.remind;
                if (!remindType) return;
                const RE =
                    /\[\[\s*remind\s*:\s*([^|\]]+?)(?:\|([^\]]+))?\s*\]\]/gi;
                type MatchItem = {
                    from: number;
                    to: number;
                    whenText: string;
                    attrs: Record<string, unknown>;
                };
                const matches: MatchItem[] = [];
                doc.descendants((node: PMNode, pos: number) => {
                    if (!node.isText) return;
                    const text = (node.text || '').toString();
                    if (!text) return;
                    RE.lastIndex = 0;
                    let m: RegExpExecArray | null;
                    while ((m = RE.exec(text)) !== null) {
                        const full = m[0];
                        const whenText = (m[1] || '').trim();
                        const rest = (m[2] || '').trim();
                        const attrs: Record<string, unknown> = {
                            kind: 'remind',
                            whenText,
                        };
                        if (rest) {
                            for (const piece of rest
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)) {
                                const [rk, rv] = piece
                                    .split('=')
                                    .map((s) => s.trim());
                                if (!rk || !rv) continue;
                                if (rk.toLowerCase() === 'iso')
                                    (attrs as Record<string, unknown>).whenISO =
                                        rv;
                                else if (rk.toLowerCase() === 'status')
                                    (attrs as Record<string, unknown>).status =
                                        rv;
                                else
                                    (attrs as Record<string, unknown>)[rk] = rv;
                            }
                        }
                        const from = pos + (m.index ?? 0);
                        const to = from + full.length;
                        matches.push({ from, to, whenText, attrs });
                    }
                });
                if (matches.length) {
                    matches
                        .sort((a, b) => b.from - a.from)
                        .forEach(({ from, to, whenText, attrs }) => {
                            const content = whenText
                                ? schema.text(whenText)
                                : schema.text('\u00A0');
                            const node = remindType.create(attrs, content);
                            const trReplace = view.state.tr.replaceWith(
                                from,
                                to,
                                node
                            );
                            view.dispatch(trReplace);
                        });
                }
            });
        } catch (e) {
             
            console.warn('Initial rehydrate remind failed:', e);
        }

        if (editorRootRef.current) {
            editorRootRef.current.style.minHeight = '';
        }
    }, []);

    React.useEffect(() => {
        void createEditor(initialMarkdown);
        return () => {
            void editorInstanceRef.current?.destroy();
            editorInstanceRef.current = null;
        };
    }, [createEditor, initialMarkdown]);

    // Live-sync while in Markdown view
    React.useEffect(() => {
        if (viewMode !== 'markdown') return;
        const value = markdownSource;
        if (value === lastSyncedMarkdownRef.current) return;
        const timer = window.setTimeout(() => {
            const instance = editorInstanceRef.current;
            if (!instance) return;
            try {
                instance.editor.action((ctx) => {
                    replaceAll(value)(ctx);
                });
                lastSyncedMarkdownRef.current = value;
                onRemindersChange?.(readReminders());
            } catch (e) {
                 
                console.warn('Live sync failed:', e);
            }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [markdownSource, viewMode]);

    const handleToggleView = React.useCallback(async () => {
        pendingScrollYRef.current = window.scrollY;

        try {
            const instance = editorInstanceRef.current;
            if (viewMode === 'wysiwyg') {
                if (instance) {
                    try {
                        const latest = await instance.getMarkdown();
                        if (latest !== undefined && latest !== markdownSource) {
                            setMarkdownSource(latest);
                            onMarkdownChange?.(latest);
                        }
                        const view = instance.editor.action((ctx) =>
                            ctx.get(editorViewCtx)
                        );
                        if (view) {
                            const { from, to } = view.state.selection;
                            milkdownSelectionRef.current = { from, to };
                        }
                    } catch (err) {
                         
                        console.error('Failed to capture markdown source', err);
                    }
                }
                markdownDirtyRef.current = false;
                setViewMode('markdown');
                onViewModeChange?.('markdown');
            } else {
                const markdownView = codeMirrorRef.current?.view;
                if (markdownView) {
                    const sel = markdownView.state.selection.main;
                    markdownSelectionRef.current = {
                        from: sel.from,
                        to: sel.to,
                    };
                }
                if (instance) {
                    const currentMarkdown =
                        codeMirrorRef.current?.view?.state.doc.toString() ??
                        markdownSource;
                    instance.editor.action((ctx) => {
                        replaceAll(currentMarkdown)(ctx);
                        const view = ctx.get(editorViewCtx);
                        // Rehydrate [[remind: ...]] brackets into remind inline nodes to ensure proper pills render
                        try {
                            const { state } = view;
                            const { schema, doc } = state;
                            const remindType = (schema as PMSchema).nodes
                                ?.remind;
                            if (remindType) {
                                const RE =
                                    /\[\[\s*remind\s*:\s*([^|\]]+?)(?:\|([^\]]+))?\s*\]\]/gi;
                                type MatchItem = {
                                    from: number;
                                    to: number;
                                    whenText: string;
                                    attrs: Record<string, any>;
                                };
                                const matches: MatchItem[] = [];
                                doc.descendants((node: PMNode, pos: number) => {
                                    if (!node.isText) return;
                                    const text = (node.text || '').toString();
                                    if (!text) return;
                                    RE.lastIndex = 0; // reset for each text node
                                    let m: RegExpExecArray | null;
                                    while ((m = RE.exec(text)) !== null) {
                                        const full = m[0];
                                        const whenText = (m[1] || '').trim();
                                        const rest = (m[2] || '').trim();
                                        type RemindAttrs = {
                                            kind: 'remind';
                                            whenText: string;
                                            whenISO?: string | null;
                                            status?:
                                                | 'scheduled'
                                                | 'overdue'
                                                | 'done';
                                            id?: string | null;
                                        };
                                        const attrs: RemindAttrs = {
                                            kind: 'remind',
                                            whenText,
                                        };
                                        if (rest) {
                                            for (const piece of rest
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean)) {
                                                const [rk, rv] =
                                                    piece.split('=');
                                                const k = rk?.trim();
                                                const v = rv?.trim();
                                                if (!k || !v) continue;
                                                if (k.toLowerCase() === 'iso')
                                                    attrs.whenISO = v;
                                                else if (
                                                    k.toLowerCase() === 'status'
                                                )
                                                    attrs.status =
                                                        v as RemindAttrs['status'];
                                            }
                                        }
                                        const from = pos + (m.index ?? 0);
                                        const to = from + full.length;
                                        matches.push({
                                            from,
                                            to,
                                            whenText,
                                            attrs,
                                        });
                                    }
                                });
                                if (matches.length) {
                                    // Replace from the end to keep positions valid
                                    matches
                                        .sort((a, b) => b.from - a.from)
                                        .forEach(
                                            ({ from, to, whenText, attrs }) => {
                                                const content = whenText
                                                    ? schema.text(whenText)
                                                    : schema.text('\u00A0');
                                                const node = remindType.create(
                                                    attrs,
                                                    content
                                                );
                                                const trReplace =
                                                    view.state.tr.replaceWith(
                                                        from,
                                                        to,
                                                        node
                                                    );
                                                view.dispatch(trReplace);
                                            }
                                        );
                                }
                            }
                        } catch (e) {
                             
                            console.warn('Rehydrate remind failed:', e);
                        }
                        onRemindersChange?.(readReminders());
                        const selectionSnapshot = milkdownSelectionRef.current;
                        if (!markdownDirtyRef.current && selectionSnapshot) {
                            const { doc } = view.state;
                            const safeTo = Math.max(
                                1,
                                Math.min(
                                    selectionSnapshot.to,
                                    doc.content.size - 1
                                )
                            );
                            const safeFrom = Math.max(
                                1,
                                Math.min(selectionSnapshot.from, safeTo)
                            );
                            let tr = view.state.tr;
                            try {
                                const sel = TextSelection.create(
                                    doc,
                                    safeFrom,
                                    safeTo
                                );
                                tr = tr.setSelection(sel).scrollIntoView();
                            } catch {
                                // Fallback to a nearby valid selection if direct text selection fails
                                try {
                                    const $pos = doc.resolve(
                                        Math.max(
                                            1,
                                            Math.min(
                                                safeTo,
                                                doc.content.size - 1
                                            )
                                        )
                                    );
                                    const sel = Selection.near($pos, -1);
                                    tr = tr.setSelection(sel).scrollIntoView();
                                } catch {
                                    // Final fallback: select end of document
                                    tr = tr
                                        .setSelection(Selection.atEnd(doc))
                                        .scrollIntoView();
                                }
                            }
                            view.dispatch(tr);
                        } else {
                            view.dispatch(view.state.tr.scrollIntoView());
                        }
                        view.focus();
                        milkdownSelectionRef.current = null;
                    });
                }
                markdownDirtyRef.current = false;
                setViewMode('wysiwyg');
                onViewModeChange?.('wysiwyg');
            }
        } finally {
            const y = pendingScrollYRef.current;
            if (y !== null) {
                requestAnimationFrame(() =>
                    window.scrollTo({ top: y, behavior: 'auto' })
                );
            }
            pendingScrollYRef.current = null;
        }
    }, [markdownSource, onMarkdownChange, onViewModeChange, viewMode]);

    React.useEffect(() => {
        if (viewMode !== 'markdown') return;
        const view = codeMirrorRef.current?.view;
        if (!view) return;

        const docLength = view.state.doc.length;
        const sourceSelection =
            markdownSelectionRef.current ?? milkdownSelectionRef.current;
        const fallbackPosition = docLength;
        const safeFrom = Math.min(
            sourceSelection?.from ?? fallbackPosition,
            docLength
        );
        const safeTo = Math.min(sourceSelection?.to ?? safeFrom, docLength);
        const selection = EditorSelection.range(safeFrom, safeTo);
        const shouldClearMilkdown = Boolean(milkdownSelectionRef.current);
        requestAnimationFrame(() => {
            view.dispatch({ selection, scrollIntoView: true });
            markdownSelectionRef.current = {
                from: selection.from,
                to: selection.to,
            };
            if (shouldClearMilkdown) milkdownSelectionRef.current = null;
            view.focus();
        });
    }, [viewMode]);

    return (
        <div className={className}>
            <div
                className="crepe theme-frame h-full min-h-[560px] w-full"
                ref={editorRootRef}
                style={
                    viewMode === 'wysiwyg'
                        ? undefined
                        : {
                              visibility: 'hidden',
                              position: 'absolute',
                              inset: '0',
                              pointerEvents: 'none',
                              width: '100%',
                          }
                }
            />
            {viewMode === 'markdown' ? (
                <div className="crepe theme-frame min-h-[560px] px-4 py-6 sm:px-8 lg:px-[120px]">
                    <CodeMirror
                        ref={codeMirrorRef}
                        value={markdownSource}
                        height="auto"
                        extensions={baseMarkdownExtensions}
                        basicSetup={{
                            lineNumbers: true,
                            highlightActiveLine: true,
                            highlightActiveLineGutter: false,
                        }}
                        onChange={(value) => {
                            if (value === markdownSource) return;
                            markdownDirtyRef.current = true;
                            setMarkdownSource(value);
                            onMarkdownChange?.(value);
                        }}
                        onUpdate={(viewUpdate) => {
                            const { from, to } =
                                viewUpdate.state.selection.main;
                            markdownSelectionRef.current = { from, to };
                        }}
                        className="w-full"
                    />
                </div>
            ) : null}
        </div>
    );
});

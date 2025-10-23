'use client';

import * as React from 'react';

import { EditorHeader } from '@/components/document-editor/editor-header';
import {
    DocumentEditor,
    type DocumentEditorHandle,
    type ViewMode,
} from '@/components/document-editor/editor';
import {
    remindNodeSchema,
    remindBracketInputRule,
    remindSlashInputRule,
    remindDomView,
    remindAutoParseProse,
    removeEmptyRemindProse,
    remindBackspaceDeleteProse,
} from '@/components/document-editor/milkdown-remind';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import type { Node as PMNode } from 'prosemirror-model';
import '@/components/document-editor/remind.css';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const INITIAL_MARKDOWN = `# Document Editor

Welcome to the editor! This document shows how the editor will render markdown content.

Here are two sample reminders embedded as bracket syntax so they render as remind pills:

- [[remind: Call Alice in 1 hour]]
- [[remind: Submit report | status=done]]
`;

// #TODO EXTRACTB EDITOR PAGE
//

export default function NewDocumentEditorPage() {
    const [viewMode, setViewMode] = React.useState<ViewMode>('wysiwyg');
    const [markdownSource, setMarkdownSource] =
        React.useState<string>(INITIAL_MARKDOWN);
    const [reminders, setReminders] = React.useState<
        Array<{
            from: number;
            to: number;
            whenText: string;
            whenISO: string | null;
            status: 'scheduled' | 'overdue' | 'done';
            id?: string | null;
        }>
    >([]);

    const editorRef = React.useRef<DocumentEditorHandle | null>(null);

    const commandsDropdown = React.useMemo(() => {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        Reminders
                        <Badge variant="outline" className="h-5 text-xs">
                            {reminders.length}
                        </Badge>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    {reminders.length === 0 ? (
                        <DropdownMenuItem disabled>
                            No reminders
                        </DropdownMenuItem>
                    ) : (
                        reminders.map((r, idx) => (
                            <DropdownMenuItem
                                key={r.id ?? `${r.from}-${idx}`}
                                asChild
                            >
                                <button
                                    type="button"
                                    className="w-full text-left"
                                    onClick={() => {
                                        setTimeout(() => {
                                            const fn =
                                                editorRef.current?.jumpTo;
                                            if (typeof fn === 'function') {
                                                // prefer id-based jump; fallback to numeric pos
                                                (fn as any)(r.id ?? r.from);
                                            }
                                        }, 50);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm">
                                            {r.whenText || 'Reminder'}
                                        </span>
                                        {r.whenISO ? (
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                    r.whenISO
                                                ).toLocaleString()}
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }, [reminders]);

    const handleToggleView = React.useCallback(() => {
        editorRef.current?.toggleView();
    }, []);

    // No React NodeView needed; using DOM NodeView + plugins
    return (
        <Sheet>
            <div className="flex h-full flex-col">
                <EditorHeader
                    title="Untitled document"
                    lastSavedLabel={
                        viewMode === 'wysiwyg'
                            ? 'Editing in WYSIWYG'
                            : 'Editing markdown source'
                    }
                    isFavorited={false}
                    viewMode={viewMode}
                    onToggleView={handleToggleView}
                    toggleDisabled={false}
                    onFavoriteToggle={undefined}
                    commandsDropdown={
                        viewMode === 'wysiwyg' ? commandsDropdown : undefined
                    }
                    actions={[
                        { label: 'View document history', href: '#' },
                        { label: 'Open ingestion queue', href: '#' },
                        // 'Insert remind' removed from header actions
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:justify-center">
                    <main className="relative rounded-lg border border-border bg-background shadow-sm lg:max-w-[60rem] lg:flex-grow">
                        <DocumentEditor
                            ref={editorRef}
                            initialMarkdown={markdownSource}
                            onMarkdownChange={setMarkdownSource}
                            onViewModeChange={setViewMode}
                            onRemindersChange={setReminders}
                            configureEditor={async (crepe) => {
                                await crepe.editor
                                    .use(remindNodeSchema)
                                    .use(remindBracketInputRule)
                                    .use(remindSlashInputRule)
                                    .use(remindDomView)
                                    .use(remindAutoParseProse)
                                    .use(remindBackspaceDeleteProse)
                                    .use(removeEmptyRemindProse)
                                    .use(listener)
                                    .config((ctx) => {
                                        const l = ctx.get(listenerCtx);
                                        l.updated((_, doc) => {
                                            const items: Array<{
                                                from: number;
                                                to: number;
                                                whenText: string;
                                                whenISO: string | null;
                                                status:
                                                    | 'scheduled'
                                                    | 'overdue'
                                                    | 'done';
                                                id?: string | null;
                                            }> = [];
                                            doc.descendants(
                                                (node: PMNode, pos: number) => {
                                                    if (
                                                        node?.type?.name ===
                                                        'remind'
                                                    ) {
                                                        const attrs =
                                                            (node.attrs ||
                                                                {}) as Record<
                                                                string,
                                                                unknown
                                                            >;
                                                        items.push({
                                                            from: pos,
                                                            to:
                                                                pos +
                                                                node.nodeSize,
                                                            whenText: (
                                                                attrs.whenText ||
                                                                node.textContent ||
                                                                ''
                                                            ).toString(),
                                                            whenISO:
                                                                (attrs.whenISO as
                                                                    | string
                                                                    | null
                                                                    | undefined) ??
                                                                null,
                                                            status: (():
                                                                | 'scheduled'
                                                                | 'overdue'
                                                                | 'done' => {
                                                                const s =
                                                                    String(
                                                                        attrs.status ??
                                                                            'scheduled'
                                                                    );
                                                                return s ===
                                                                    'overdue'
                                                                    ? 'overdue'
                                                                    : s ===
                                                                      'done'
                                                                    ? 'done'
                                                                    : 'scheduled';
                                                            })(),
                                                            id:
                                                                (attrs.id as
                                                                    | string
                                                                    | null
                                                                    | undefined) ??
                                                                null,
                                                        });
                                                    }
                                                }
                                            );
                                            setReminders(items);
                                        });
                                    })
                                    .create();
                            }}
                        />
                    </main>
                </div>
            </div>
        </Sheet>
    );
}

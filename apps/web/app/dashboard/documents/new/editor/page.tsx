'use client';

import * as React from 'react';

import { EditorHeader } from '@/components/editor/editor-header';
import {
    CrepeMarkdownEditor,
    type CrepeMarkdownEditorHandle,
    type ViewMode,
} from '@/components/editor/editor';
import {
    remindNodeSchema,
    remindBracketInputRule,
    remindSlashInputRule,
    remindDomView,
    remindAutoParseProse,
    removeEmptyRemindProse,
    remindBackspaceDeleteProse,
} from './milkdown-remind';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import type { Node as PMNode } from 'prosemirror-model';
import './remind.css';
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

const INITIAL_MARKDOWN = `# Document Editor

Welcome to the editor! This document shows how the editor will render markdown content.

Here are two sample reminders embedded as bracket syntax so they render as remind pills:

- [[remind: Call Alice in 1 hour]]
- [[remind: Submit report | status=done]]
`;

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
        }>
    >([]);

    const editorRef = React.useRef<CrepeMarkdownEditorHandle | null>(null);

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
                    actions={[
                        { label: 'View document history', href: '#' },
                        { label: 'Open ingestion queue', href: '#' },
                        // 'Insert remind' removed from header actions
                    ]}
                    headerRight={
                        <div className="flex items-center">
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    Metadata
                                </Button>
                            </SheetTrigger>
                        </div>
                    }
                />
                <div className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row lg:items-start lg:justify-center">
                    <main className="relative rounded-lg border border-border bg-background shadow-sm lg:max-w-[60rem] lg:flex-grow">
                        <CrepeMarkdownEditor
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

                    {/* SheetContent rendered in the right column */}
                    <SheetContent side="right">
                        <SheetHeader>
                            <SheetTitle>Metadata</SheetTitle>
                            <SheetDescription>
                                Edit tags, commands, and metadata for this
                                document.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="p-4">
                            <section className="mb-6">
                                <h3 className="mb-2 text-sm font-medium">
                                    Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {/* placeholder tags until tagging is implemented */}
                                    <span className="px-2 py-1 rounded bg-muted text-sm">
                                        research
                                    </span>
                                    <span className="px-2 py-1 rounded bg-muted text-sm">
                                        draft
                                    </span>
                                    <span className="px-2 py-1 rounded bg-muted text-sm">
                                        todo
                                    </span>
                                </div>
                            </section>

                            <section>
                                <h3 className="mb-2 text-sm font-medium">
                                    Commands
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex flex-col gap-2">
                                        {reminders.length === 0 ? (
                                            <div className="text-sm text-muted-foreground">
                                                No reminders yet
                                            </div>
                                        ) : (
                                            reminders.map((r, i) => {
                                                const variant =
                                                    r.status === 'done'
                                                        ? 'secondary'
                                                        : 'default';
                                                return (
                                                    <Badge
                                                        key={`${r.from}-${i}`}
                                                        variant={
                                                            variant as
                                                                | 'default'
                                                                | 'secondary'
                                                                | 'destructive'
                                                                | 'outline'
                                                        }
                                                        className="cursor-pointer"
                                                        onClick={() =>
                                                            editorRef.current?.jumpTo?.(
                                                                r.from
                                                            )
                                                        }
                                                    >
                                                        {r.whenText}
                                                    </Badge>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </SheetContent>
                </div>
            </div>
        </Sheet>
    );
}

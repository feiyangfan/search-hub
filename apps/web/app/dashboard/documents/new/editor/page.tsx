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
import '@/components/document-editor/remind.css';

import { commandsDropdown } from '@/components/document-editor/command-dropdown';

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

    const commandsDropdownElement = commandsDropdown(reminders, editorRef);

    const handleToggleView = React.useCallback(() => {
        editorRef.current?.toggleView();
    }, []);

    return (
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
                    viewMode === 'wysiwyg' ? commandsDropdownElement : undefined
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
                                .create();
                        }}
                    />
                </main>
            </div>
        </div>
    );
}

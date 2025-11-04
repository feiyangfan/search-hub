'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { X, Plus, Search, Palette } from 'lucide-react';
import { SketchPicker, type ColorResult } from 'react-color';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export type TagOption = {
    id: string;
    name: string;
    color: string;
    description?: string;
};

export type TagDraft = {
    name: string;
    color: string;
    description?: string;
};

export const DEFAULT_TAG_COLOR = '#6366f1';
const PRESET_TAG_COLORS = [
    '#6366f1',
    '#0ea5e9',
    '#14b8a6',
    '#22c55e',
    '#facc15',
    '#f97316',
    '#ec4899',
    '#a855f7',
    '#ef4444',
    '#8b5cf6',
];

type EditorHeaderTagEditingProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentTitle: string;
    documentTags: TagOption[];
    availableTags: TagOption[];
    onAddTag: (tag: TagOption) => void;
    onRemoveTag: (tagId: string) => void;
    onCreateTag: (draft: TagDraft) => TagOption | null;
};

export function EditorHeaderTagEditing({
    open,
    onOpenChange,
    documentTitle,
    documentTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
}: EditorHeaderTagEditingProps) {
    const [query, setQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [draftDescription, setDraftDescription] = useState('');
    const [draftColor, setDraftColor] = useState(DEFAULT_TAG_COLOR);

    const trimmedQuery = query.trim();
    const normalizedQuery = trimmedQuery.toLowerCase();

    const filteredSuggestions = useMemo(() => {
        return availableTags
            .filter(
                (tag) =>
                    !documentTags.some((selected) => selected.id === tag.id)
            )
            .filter((tag) =>
                normalizedQuery
                    ? tag.name.toLowerCase().includes(normalizedQuery)
                    : true
            )
            .slice(0, 10);
    }, [availableTags, documentTags, normalizedQuery]);

    const canCreate =
        normalizedQuery.length > 0 &&
        ![...availableTags, ...documentTags].some(
            (tag) => tag.name.toLowerCase() === normalizedQuery
        );

    const handleSelect = (tag: TagOption) => {
        onAddTag(tag);
        setQuery('');
    };

    const openCreateDialog = () => {
        if (!canCreate) {
            return;
        }
        setDraftName(trimmedQuery);
        setDraftDescription('');
        setDraftColor(DEFAULT_TAG_COLOR);
        setCreateOpen(true);
    };

    const handleCreateSubmit = () => {
        const name = draftName.trim();
        if (!name) {
            return;
        }
        const created = onCreateTag({
            name,
            color: draftColor,
            description: draftDescription.trim() || undefined,
        });
        if (created) {
            setCreateOpen(false);
            setQuery('');
        }
    };

    useEffect(() => {
        if (!open) {
            setQuery('');
            setCreateOpen(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl space-y-6">
                <DialogHeader>
                    <DialogTitle>Edit tags</DialogTitle>
                    <DialogDescription>
                        Attach tags to{' '}
                        <span className="font-medium text-foreground">
                            {documentTitle || 'this document'}
                        </span>{' '}
                        to help teammates discover and organize content.
                    </DialogDescription>
                </DialogHeader>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">
                            Current tags
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {documentTags.length} selected
                        </span>
                    </div>
                    {documentTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {documentTags.map((tag) => (
                                <TagPill
                                    key={tag.id}
                                    tag={tag}
                                    onRemove={() => onRemoveTag(tag.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No tags yet. Add a tag to get started." />
                    )}
                </section>

                <Separator />

                <section className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">
                        Add tags
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search tags (or type to create a new one)"
                            className="pl-9"
                        />
                    </div>
                    {Boolean(filteredSuggestions.length) ? (
                        <ul className="max-h-40 space-y-1 overflow-auto rounded-md border p-2 text-sm">
                            {filteredSuggestions.map((tag) => (
                                <li key={tag.id}>
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-2 text-left hover:bg-muted"
                                        onClick={() => handleSelect(tag)}
                                    >
                                        <span className="flex flex-1 flex-col gap-1">
                                            <Badge
                                                variant="secondary"
                                                className="w-fit font-medium"
                                                style={badgeStyle(tag.color)}
                                            >
                                                {tag.name}
                                            </Badge>
                                            {tag.description ? (
                                                <span className="text-xs text-muted-foreground">
                                                    {tag.description}
                                                </span>
                                            ) : null}
                                        </span>
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState message="No matching tags. Create a new one below." />
                    )}
                    <div className="flex items-center justify-between rounded-md border border-dashed p-3">
                        <div className="space-y-1 text-sm">
                            <p className="font-medium text-foreground">
                                Need something new?
                            </p>
                            <p className="text-muted-foreground">
                                Create a workspace tag directly from here.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={openCreateDialog}
                            disabled={!canCreate}
                        >
                            Create “{trimmedQuery || 'tag'}”
                        </Button>
                    </div>
                </section>

                <DialogFooter className="flex items-center justify-end gap-2 sm:space-x-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
            <TagCreateDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                name={draftName}
                description={draftDescription}
                color={draftColor}
                onNameChange={setDraftName}
                onDescriptionChange={setDraftDescription}
                onColorChange={setDraftColor}
                onSubmit={handleCreateSubmit}
            />
        </Dialog>
    );
}

function TagPill({ tag, onRemove }: { tag: TagOption; onRemove: () => void }) {
    return (
        <Badge
            variant="secondary"
            className="inline-flex items-center gap-2 pr-1"
            style={badgeStyle(tag.color)}
            title={tag.description}
        >
            {tag.name}
            <button
                type="button"
                aria-label={`Remove ${tag.name}`}
                className="rounded-sm p-1 hover:bg-muted/80"
                onClick={onRemove}
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </Badge>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {message}
        </p>
    );
}

function badgeStyle(color: string): CSSProperties {
    const background = hexToRgba(color, 0.15);
    return {
        backgroundColor: background,
        borderColor: color,
        color,
    };
}

function hexToRgba(hex: string, alpha: number) {
    let sanitized = hex.replace('#', '');
    if (sanitized.length === 3) {
        sanitized = sanitized
            .split('')
            .map((char) => char + char)
            .join('');
    }
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type TagCreateDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name: string;
    description: string;
    color: string;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onColorChange: (value: string) => void;
    onSubmit: () => void;
};

function TagCreateDialog({
    open,
    onOpenChange,
    name,
    description,
    color,
    onNameChange,
    onDescriptionChange,
    onColorChange,
    onSubmit,
}: TagCreateDialogProps) {
    const canSave = name.trim().length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md space-y-6">
                <DialogHeader>
                    <DialogTitle>Create tag</DialogTitle>
                    <DialogDescription>
                        Provide a name, optional description, and pick a color
                        to create a workspace tag.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Tag name
                        </label>
                        <Input
                            value={name}
                            onChange={(event) =>
                                onNameChange(event.target.value)
                            }
                            placeholder="e.g. Launch readiness"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Description{' '}
                            <span className="text-muted-foreground">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(event) =>
                                onDescriptionChange(event.target.value)
                            }
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            placeholder="Explain how this tag is used by your workspace."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            Tag color
                        </label>
                        <div className="rounded-md border border-border/60 bg-background p-2 shadow-sm">
                                    <SketchPicker
                                        color={color}
                                        onChange={(result: ColorResult) =>
                                            onColorChange(result.hex)
                                        }
                                        disableAlpha
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-end gap-2 sm:space-x-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={!canSave}
                    >
                        Create tag
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

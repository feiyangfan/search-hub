'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Palette, Loader2 } from 'lucide-react';
import { SketchPicker, type ColorResult } from 'react-color';
// # TODO REMOVETHIS THING
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tag, DEFAULT_TAG_COLOR, type TagOption } from '@/components/ui/tag';

export type { TagOption } from '@/components/ui/tag';

export type TagDraft = {
    name: string;
    color: string;
    description?: string;
};

type TagEditingDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentTitle: string;
    documentTags: TagOption[];
    availableTags: TagOption[];
    onAddTag: (tag: TagOption) => void;
    onRemoveTag: (tagId: string) => void;
    onCreateTag: (draft: TagDraft) => Promise<TagOption | null>;
    isCreatingTag: boolean;
    isTagMutationPending: boolean;
};

export function TagEditingDialog({
    open,
    onOpenChange,
    documentTitle,
    documentTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
    isCreatingTag,
    isTagMutationPending,
}: TagEditingDialogProps) {
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
        if (isTagMutationPending) {
            return;
        }
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

    const handleCreateSubmit = async () => {
        const name = draftName.trim();
        if (!name) {
            return;
        }
        const created = await onCreateTag({
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
                                <Tag
                                    key={tag.id}
                                    tag={tag}
                                    variant="removable"
                                    onRemove={() => {
                                        if (!isTagMutationPending) {
                                            onRemoveTag(tag.id);
                                        }
                                    }}
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
                                        className="flex w-full items-center justify-between gap-4 rounded-sm px-2 py-2 text-left hover:bg-muted disabled:opacity-60"
                                        disabled={isTagMutationPending}
                                        onClick={() => handleSelect(tag)}
                                    >
                                        <span className="flex flex-1 flex-col gap-1">
                                            <Tag tag={tag} />
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
                            disabled={!canCreate || isTagMutationPending}
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
                isSubmitting={isCreatingTag}
                isDisabled={isTagMutationPending}
            />
        </Dialog>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            {message}
        </p>
    );
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
    onSubmit: () => Promise<void>;
    isSubmitting: boolean;
    isDisabled?: boolean;
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
    isSubmitting,
    isDisabled = false,
}: TagCreateDialogProps) {
    const canSave = name.trim().length > 0;
    const actionDisabled = isSubmitting || isDisabled;

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
                        disabled={actionDisabled}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            void onSubmit();
                        }}
                        disabled={!canSave || actionDisabled}
                    >
                        {actionDisabled ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isSubmitting ? 'Creating…' : 'Working…'}
                            </>
                        ) : (
                            'Create tag'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

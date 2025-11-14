'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
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
import { TagCreateDialog } from '@/components/tags/tag-create-dialog';

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

'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { SketchPicker, type ColorResult } from 'react-color';
import { Pencil, Trash2 } from 'lucide-react';

import { useWorkspaceTagsQuery } from '@/hooks/use-documents';
import { WORKSPACE_TAGS_MANAGEMENT_PARAMS } from '@/queries/tags';
import { useWorkspaceTagActions } from '@/hooks/use-workspace-tag-actions';
import { Tag as TagBadge, DEFAULT_TAG_COLOR } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { TagCreateDialog } from '@/components/tags/tag-create-dialog';

const TAG_QUERY_PARAMS = WORKSPACE_TAGS_MANAGEMENT_PARAMS;

type ManagedTag = {
    id: string;
    name: string;
    color?: string | null;
    description?: string | null;
    documentCount?: number | null;
};

export default function WorkspaceManagementPage() {
    const {
        data: tags,
        isLoading,
        isError,
        error,
        refetch,
    } = useWorkspaceTagsQuery(TAG_QUERY_PARAMS);
    const {
        createTag,
        updateTag,
        deleteTag,
        createPending,
        updatePending,
        deletePending,
    } = useWorkspaceTagActions();

    const [editingTag, setEditingTag] = useState<ManagedTag | null>(null);
    const [editDraft, setEditDraft] = useState({
        name: '',
        color: DEFAULT_TAG_COLOR,
        description: '',
    });
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ManagedTag | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createDraft, setCreateDraft] = useState({
        name: '',
        color: DEFAULT_TAG_COLOR,
        description: '',
    });

    useEffect(() => {
        if (editingTag) {
            setEditDraft({
                name: editingTag.name ?? '',
                color: editingTag.color ?? DEFAULT_TAG_COLOR,
                description: editingTag.description ?? '',
            });
            setColorPickerOpen(false);
        } else {
            setEditDraft({
                name: '',
                color: DEFAULT_TAG_COLOR,
                description: '',
            });
            setColorPickerOpen(false);
        }
    }, [editingTag]);

    const tagList = useMemo(() => tags ?? [], [tags]);

    const handleDraftChange =
        (field: 'name' | 'description') =>
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { value } = event.target;
            setEditDraft((prev) => ({ ...prev, [field]: value }));
        };

    const handleEditSubmit = async () => {
        if (!editingTag) return;
        const trimmedName = editDraft.name.trim();
        const trimmedDescription = editDraft.description.trim();
        await updateTag({
            id: editingTag.id,
            name: trimmedName,
            color: editDraft.color,
            description:
                trimmedDescription.length > 0 ? trimmedDescription : null,
        });
        setEditingTag(null);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        await deleteTag(deleteTarget.id);
        setDeleteTarget(null);
    };

    const handleCreateSubmit = async () => {
        const trimmedName = createDraft.name.trim();
        if (!trimmedName) {
            return;
        }
        const trimmedDescription = createDraft.description.trim();
        await createTag({
            name: trimmedName,
            color: createDraft.color,
            description: trimmedDescription.length > 0
                ? trimmedDescription
                : undefined,
        });
        setCreateDialogOpen(false);
        setCreateDraft({
            name: '',
            color: DEFAULT_TAG_COLOR,
            description: '',
        });
    };

    return (
        <>
        <div className="flex min-h-full flex-col gap-6 bg-muted/5 px-4 py-6">
            <span className="text-xl font-bold">Workspace management</span>

            <Card className="w-[24rem]">
                <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle>Tag catalog</CardTitle>
                        <Button
                            size="sm"
                            variant={'outline'}
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            +
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <Skeleton
                                    key={`tag-skel-${index}`}
                                    className="h-16 w-full"
                                />
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                            <p className="font-medium text-destructive">
                                Failed to load tags
                            </p>
                            <p className="text-muted-foreground">
                                {(error as Error | undefined)?.message ??
                                    'Unknown error'}
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => refetch()}
                            >
                                Try again
                            </Button>
                        </div>
                    ) : tagList.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No tags available yet. Create one from the tag
                            sidebar or document editors.
                        </div>
                    ) : (
                        <div className="divide-y rounded-xl border">
                            {tagList.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="flex flex-col gap-4 pt-2 pl-3 pb-2 sm:flex-row sm:items-center justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <TagBadge
                                                tag={{
                                                    id: tag.id,
                                                    name: tag.name,
                                                    color:
                                                        tag.color ??
                                                        DEFAULT_TAG_COLOR,
                                                }}
                                            />
                                            <Badge variant="secondary">
                                                {tag.documentCount ?? 0} docs
                                            </Badge>
                                        </div>
                                        <p
                                            className="mt-1 text-sm text-muted-foreground overflow-hidden"
                                            style={{
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: 1,
                                            }}
                                        >
                                            {tag.description ||
                                                'No description yet.'}
                                        </p>
                                    </div>

                                    <div className="flex">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingTag(tag)}
                                        >
                                            <Pencil className=" h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteTarget(tag)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={Boolean(editingTag)}
                onOpenChange={(open) => !open && setEditingTag(null)}
            >
                <DialogContent className="max-w-lg space-y-4">
                    <DialogHeader>
                        <DialogTitle>Edit tag metadata</DialogTitle>
                        <DialogDescription>
                            Update the name, color, or description for this
                            workspace tag.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-name-edit">Name</Label>
                            <Input
                                id="tag-name-edit"
                                value={editDraft.name}
                                onChange={handleDraftChange('name')}
                                placeholder="Enter tag name"
                                disabled={updatePending}
                                maxLength={20}
                            />
                            <p className="text-xs text-muted-foreground">
                                {20 - editDraft.name.length} characters
                                remaining
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tag-color-edit">Color</Label>
                            <div className="flex flex-wrap items-center gap-3">
                                <Popover
                                    modal={false}
                                    open={colorPickerOpen}
                                    onOpenChange={setColorPickerOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-left text-sm shadow-sm"
                                            disabled={updatePending}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="h-6 w-6 rounded-full border shadow-inner"
                                                style={{
                                                    backgroundColor:
                                                        editDraft.color ||
                                                        DEFAULT_TAG_COLOR,
                                                }}
                                            />
                                            <span className="font-mono uppercase text-foreground">
                                                {editDraft.color}
                                            </span>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-3"
                                        onPointerDownOutside={(event) =>
                                            event.preventDefault()
                                        }
                                        onInteractOutside={(event) =>
                                            event.preventDefault()
                                        }
                                    >
                                        <SketchPicker
                                            color={editDraft.color}
                                            onChange={(result: ColorResult) =>
                                                setEditDraft((prev) => ({
                                                    ...prev,
                                                    color: result.hex,
                                                }))
                                            }
                                            onChangeComplete={() =>
                                                setColorPickerOpen(false)
                                            }
                                            disableAlpha
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tag-description-edit">
                                Description
                            </Label>
                            <textarea
                                id="tag-description-edit"
                                value={editDraft.description}
                                onChange={handleDraftChange('description')}
                                placeholder="Add optional guidance for tag usage."
                                rows={3}
                                disabled={updatePending}
                                maxLength={100}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                            />
                            <p className="text-xs text-muted-foreground">
                                {200 - editDraft.description.length} characters
                                remaining
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingTag(null)}
                            disabled={updatePending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleEditSubmit}
                            disabled={updatePending}
                        >
                            {updatePending ? 'Saving…' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {deleteTarget?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This removes the tag for everyone. Documents
                            currently using it will lose the label.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletePending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletePending}
                        >
                            {deletePending ? 'Deleting…' : 'Delete tag'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        <TagCreateDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            name={createDraft.name}
            description={createDraft.description}
            color={createDraft.color}
            onNameChange={(value) =>
                setCreateDraft((prev) => ({ ...prev, name: value }))
            }
            onDescriptionChange={(value) =>
                setCreateDraft((prev) => ({ ...prev, description: value }))
            }
            onColorChange={(value) =>
                setCreateDraft((prev) => ({ ...prev, color: value }))
            }
            onSubmit={handleCreateSubmit}
            isSubmitting={createPending}
            isDisabled={createPending}
        />
        </>
    );
}

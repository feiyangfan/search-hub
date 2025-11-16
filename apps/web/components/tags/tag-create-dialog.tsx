'use client';

import { useState, useEffect } from 'react';
import { Palette, Loader2 } from 'lucide-react';
import { SketchPicker, type ColorResult } from 'react-color';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export type TagCreateDialogProps = {
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

export function TagCreateDialog({
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
    const [colorPickerOpen, setColorPickerOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setColorPickerOpen(false);
        }
    }, [open]);

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
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="h-6 w-6 rounded-full border shadow-inner"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="font-mono uppercase text-foreground">
                                            {color}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3">
                                    <SketchPicker
                                        color={color}
                                        onChange={(result: ColorResult) =>
                                            onColorChange(result.hex)
                                        }
                                        disableAlpha
                                    />
                                </PopoverContent>
                            </Popover>
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

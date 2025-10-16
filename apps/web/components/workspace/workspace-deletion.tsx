'use client';

import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

import { Minus } from 'lucide-react';

interface WorkspaceDeletionConfirmationDialogProps {
    workspaceName: string;
    onConfirm: () => void;
    disabled?: boolean;
}

export function WorkspaceDeletionConfirmationDialog({
    workspaceName,
    onConfirm,
    disabled,
}: WorkspaceDeletionConfirmationDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                    disabled={disabled}
                    className="gap-2 p-2 focus:text-destructive text-red-500 bg-red-50"
                    onSelect={(event) => event.preventDefault()}
                >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                        <Minus className="size-4 text-red-500" />
                    </div>
                    <div className="font-medium text-red-500">
                        Delete workspace
                    </div>
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                        Delete “{workspaceName}”?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This removes the workspace for everyone. You can’t undo
                        it.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-foreground">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

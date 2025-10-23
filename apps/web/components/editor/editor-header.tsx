'use client';

import * as React from 'react';
import {
    Code2,
    LayoutDashboard,
    MoreHorizontal,
    Star,
    StarOff,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type EditorHeaderProps = {
    title: string;
    lastSavedLabel?: string;
    isFavorited: boolean;
    viewMode?: 'wysiwyg' | 'markdown';
    onToggleView?: () => void;
    toggleDisabled?: boolean;
    onFavoriteToggle?: () => void;
    actions?: Array<{
        label: string;
        href?: string;
        onSelect?: () => void;
    }>;
    headerRight?: React.ReactNode;
};

export function EditorHeader({
    title,
    lastSavedLabel,
    isFavorited,
    viewMode,
    onToggleView,
    toggleDisabled,
    onFavoriteToggle,
    actions,
    headerRight,
}: EditorHeaderProps) {
    const handleFavoriteToggle = React.useCallback(() => {
        if (onFavoriteToggle) {
            onFavoriteToggle();
        }
    }, [onFavoriteToggle]);

    const toggleLabel =
        viewMode === 'markdown' ? 'Return to editor' : 'View markdown';
    const ToggleIcon = viewMode === 'markdown' ? LayoutDashboard : Code2;

    return (
        <div className="sticky top-0 z-30 bg-background/95 px-6 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        {lastSavedLabel ? (
                            <span className="text-xs text-muted-foreground">
                                {lastSavedLabel}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* custom header-right node (e.g. sheet trigger) */}
                    {headerRight}
                    {onToggleView ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={onToggleView}
                            disabled={toggleDisabled}
                        >
                            <ToggleIcon className="size-4" />
                            <span className="hidden sm:inline">
                                {toggleLabel}
                            </span>
                            <span className="sm:hidden">
                                {viewMode === 'markdown' ? 'Editor' : 'MD'}
                            </span>
                        </Button>
                    ) : null}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={!onFavoriteToggle}
                        onClick={handleFavoriteToggle}
                    >
                        {isFavorited ? (
                            <>
                                <Star className="size-4 fill-current" />
                                <span className="hidden sm:inline">
                                    Favorited
                                </span>
                            </>
                        ) : (
                            <>
                                <StarOff className="size-4" />
                                <span className="hidden sm:inline">
                                    Favorite
                                </span>
                            </>
                        )}
                        <span className="sr-only sm:hidden">
                            Toggle favorite
                        </span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">
                                    Document actions
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem disabled>Rename</DropdownMenuItem>
                            {/* <DropdownMenuItem disabled>
                                Share / manage access
                            </DropdownMenuItem> */}
                            <DropdownMenuSeparator />
                            {actions?.map((action) =>
                                action.href ? (
                                    <DropdownMenuItem
                                        key={action.label}
                                        asChild
                                    >
                                        <Link href={action.href}>
                                            {action.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        key={action.label}
                                        onSelect={action.onSelect}
                                    >
                                        {action.label}
                                    </DropdownMenuItem>
                                )
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled>
                                Delete document
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

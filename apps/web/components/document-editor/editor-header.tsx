'use client';

import * as React from 'react';
import {
    Code2,
    LayoutDashboard,
    MoreHorizontal,
    Star,
    StarOff,
    Tag,
    Trash2,
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
import { Badge } from '../ui/badge';
import type { TagOption } from './editor-header-tag-editing';

type EditorHeaderProps = {
    title: string;
    lastSavedLabel?: string;
    isFavorited: boolean;
    viewMode?: 'wysiwyg' | 'markdown';
    onToggleView?: () => void;
    toggleDisabled?: boolean;
    onFavoriteToggle?: () => void;
    onTitleChange?: (newTitle: string) => Promise<void>;
    onEditTags?: () => void;
    canManageDocument?: boolean;
    onDelete?: () => void;
    documentTags?: TagOption[];
    actions?: Array<{
        label: string;
        href?: string;
        onSelect?: () => void;
    }>;
    headerRight?: React.ReactNode;
    commandsDropdown?: React.ReactNode;
};

export function EditorHeader({
    title,
    lastSavedLabel,
    isFavorited,
    viewMode,
    onToggleView,
    toggleDisabled,
    onFavoriteToggle,
    onTitleChange,
    onEditTags,
    canManageDocument = false,
    onDelete,
    documentTags = [],
    actions,
    headerRight,
    commandsDropdown,
}: EditorHeaderProps) {
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const titleRef = React.useRef<HTMLHeadingElement>(null);
    const originalTitleRef = React.useRef<string>(title);

    React.useEffect(() => {
        if (titleRef.current && titleRef.current.textContent !== title) {
            titleRef.current.textContent = title;
            originalTitleRef.current = title;
        }
    }, [title]);

    React.useEffect(() => {
        if (isEditingTitle && titleRef.current) {
            titleRef.current.focus();
        }
    }, [isEditingTitle]);

    const handleFavoriteToggle = React.useCallback(() => {
        if (onFavoriteToggle) {
            onFavoriteToggle();
        }
    }, [onFavoriteToggle]);

    const handleTitleClick = React.useCallback(() => {
        if (onTitleChange && !isEditingTitle) {
            setIsEditingTitle(true);
        }
    }, [onTitleChange, isEditingTitle]);

    const handleTitleBlur = React.useCallback(async () => {
        setIsEditingTitle(false);

        const newTitle = titleRef.current?.textContent?.trim() || '';

        if (
            !onTitleChange ||
            !newTitle ||
            newTitle === originalTitleRef.current
        ) {
            if (titleRef.current) {
                titleRef.current.textContent = originalTitleRef.current;
            }
            return;
        }

        setIsSaving(true);
        try {
            await onTitleChange(newTitle);
            originalTitleRef.current = newTitle;
        } catch (error) {
            console.error('Failed to save title:', error);
            if (titleRef.current) {
                titleRef.current.textContent = originalTitleRef.current;
            }
        } finally {
            setIsSaving(false);
        }
    }, [onTitleChange]);

    const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLHeadingElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleRef.current?.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (titleRef.current) {
                    titleRef.current.textContent = originalTitleRef.current;
                }
                titleRef.current?.blur();
            }
        },
        []
    );

    const toggleLabel =
        viewMode === 'markdown' ? 'Return to editor' : 'View markdown';
    const ToggleIcon = viewMode === 'markdown' ? LayoutDashboard : Code2;
    const showEditTags = !!onEditTags && canManageDocument;
    const hasActions = Array.isArray(actions) && actions.length > 0;
    const showDelete = !!onDelete && canManageDocument;
    const hasTags = documentTags.length > 0;

    return (
        <div className="sticky top-0 z-30 bg-background/95 px-6 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                        <h3
                            ref={titleRef}
                            contentEditable={!!onTitleChange}
                            suppressContentEditableWarning
                            className={`text-lg font-semibold outline-none rounded px-1  -mx-1  transition-colors ${
                                onTitleChange
                                    ? 'cursor-text hover:text-primary'
                                    : ''
                            } ${
                                isEditingTitle
                                    ? 'border border-gray-200'
                                    : 'border border-transparent'
                            } ${isSaving ? 'opacity-50' : ''}`}
                            onClick={handleTitleClick}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleKeyDown}
                            title={
                                onTitleChange
                                    ? 'Click to edit title'
                                    : undefined
                            }
                        >
                            {title}
                        </h3>
                        {lastSavedLabel ? (
                            <span className="text-xs text-muted-foreground">
                                {lastSavedLabel}
                            </span>
                        ) : null}
                        {headerRight}
                    </div>
                    {hasTags ? (
                        <div className="flex flex-wrap gap-2">
                            {documentTags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    className="text-xs"
                                    style={tagBadgeStyle(tag.color)}
                                    title={tag.description}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    {commandsDropdown}
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
                            {showEditTags ? (
                                <>
                                    <DropdownMenuItem
                                        onSelect={onEditTags}
                                        disabled={!onEditTags}
                                    >
                                        <Tag className="mr-2 size-4" />
                                        Edit tags
                                    </DropdownMenuItem>
                                    {(hasActions || showDelete) && (
                                        <DropdownMenuSeparator />
                                    )}
                                </>
                            ) : null}

                            {hasActions ? (
                                <>
                                    {actions!.map((action, index) => (
                                        <DropdownMenuItem
                                            key={`${action.label}-${index}`}
                                            onSelect={action.onSelect}
                                            asChild={Boolean(action.href)}
                                        >
                                            {action.href ? (
                                                <Link href={action.href}>
                                                    {action.label}
                                                </Link>
                                            ) : (
                                                action.label
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                    {showDelete && <DropdownMenuSeparator />}
                                </>
                            ) : null}

                            {showDelete ? (
                                <DropdownMenuItem
                                    onSelect={onDelete}
                                    disabled={!onDelete}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

function tagBadgeStyle(color?: string): React.CSSProperties {
    if (!color) {
        return {};
    }
    const background = hexToRgba(color, 0.16);
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
    const bigint = Number.parseInt(sanitized, 16);
    if (Number.isNaN(bigint)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

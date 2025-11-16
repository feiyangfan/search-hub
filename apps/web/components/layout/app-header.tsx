'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';
import { usePathname } from 'next/navigation';
import {
    MoreHorizontal,
    PencilLine,
    Share2,
    Star,
    Tag as TagIcon,
    Trash2,
} from 'lucide-react';

import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tag as TagBadge } from '@/components/ui/tag';
import { useDocumentHeader } from '@/components/document/document-header-context';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';
import { useDocumentActions } from '@/hooks/use-document-actions';

interface AppHeaderProps {
    session: Session | null;
    showSidebarTrigger?: boolean;
}

export function AppHeader({
    session,
    showSidebarTrigger = true,
}: AppHeaderProps) {
    const user = session?.user;
    const { state: sidebarState } = useSidebar();
    const isSidebarCollapsed = sidebarState === 'collapsed';
    const pathname = usePathname();
    const isDocumentRoute = pathname?.startsWith('/doc/');
    const segments =
        pathname?.split('/').filter((segment) => segment.length > 0) ?? [];
    const { data: documentHeaderData, setData: setDocumentHeaderData } =
        useDocumentHeader();
    const { renameDocument, renamePending } = useDocumentActions();

    const isDocumentContext = Boolean(documentHeaderData?.documentId);
    const isLoadingDoc = isDocumentRoute && !documentHeaderData;

    const documentName = documentHeaderData?.title ?? null;
    const documentTags = documentHeaderData?.tags ?? [];
    const isFavorited = documentHeaderData?.isFavorited ?? false;
    const lastEditedLabel = useMemo(() => {
        const updatedAt = documentHeaderData?.updatedAt;
        if (!updatedAt) {
            return null;
        }
        const updatedDate = new Date(updatedAt);
        if (Number.isNaN(updatedDate.getTime())) {
            return null;
        }
        const diffSeconds = Math.round(
            (Date.now() - updatedDate.getTime()) / 1000
        );
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

        if (Math.abs(diffSeconds) < 60) {
            return `Edited ${rtf.format(-diffSeconds, 'second')}`;
        }
        const diffMinutes = Math.round(diffSeconds / 60);
        if (Math.abs(diffMinutes) < 60) {
            return `Edited ${rtf.format(-diffMinutes, 'minute')}`;
        }
        const diffHours = Math.round(diffMinutes / 60);
        if (Math.abs(diffHours) < 24) {
            return `Edited ${rtf.format(-diffHours, 'hour')}`;
        }
        const diffDays = Math.round(diffHours / 24);
        if (Math.abs(diffDays) < 7) {
            return `Edited ${rtf.format(-diffDays, 'day')}`;
        }
        const diffWeeks = Math.round(diffDays / 7);
        if (Math.abs(diffWeeks) < 5) {
            return `Edited ${rtf.format(-diffWeeks, 'week')}`;
        }
        const diffMonths = Math.round(diffDays / 30);
        if (Math.abs(diffMonths) < 12) {
            return `Edited ${rtf.format(-diffMonths, 'month')}`;
        }
        const diffYears = Math.round(diffDays / 365);
        return `Edited ${rtf.format(-diffYears, 'year')}`;
    }, [documentHeaderData?.updatedAt]);

    const statusLabel =
        lastEditedLabel ??
        documentHeaderData?.statusLabel ??
        'Tracking changes...';

    const formatSegmentLabel = (segment: string) => {
        const decoded = decodeURIComponent(segment);
        return decoded
            .split(/[-_]/g)
            .map((part) =>
                part.length > 0
                    ? part[0]?.toUpperCase() + part.slice(1).toLowerCase()
                    : part
            )
            .join(' ');
    };

    type BreadcrumbEntry = {
        label: string;
        href?: string;
        accent?: boolean;
        isDocumentTitle?: boolean;
    };

    const breadcrumbs: BreadcrumbEntry[] = (() => {
        if (!segments.length) {
            return [];
        }

        if (segments[0] === 'dashboard') {
            if (segments.length === 1) {
                return [{ label: 'Dashboard Overview' }];
            }

            const crumbs: BreadcrumbEntry[] = [
                {
                    label: 'Dashboard',
                    href: segments.length > 1 ? '/dashboard' : undefined,
                },
            ];

            let accumulated = '/dashboard';
            for (let i = 1; i < segments.length; i += 1) {
                const segment = segments[i];
                accumulated += `/${segment}`;
                const isLast = i === segments.length - 1;
                crumbs.push({
                    label: formatSegmentLabel(segment),
                    href: isLast ? undefined : accumulated,
                });
            }
            return crumbs;
        }

        if (segments[0] === 'doc') {
            const crumbs: BreadcrumbEntry[] = [
                { label: 'Documents', href: '/dashboard/documents' },
            ];
            const docId = segments[1];
            if (docId) {
                crumbs.push({
                    label: documentName ?? formatSegmentLabel(docId),
                    isDocumentTitle: true,
                });
            }
            if (docId && segments.length > 2) {
                let accumulated = `/doc/${segments[1]}`;
                for (let i = 2; i < segments.length; i += 1) {
                    const segment = segments[i];
                    accumulated += `/${segment}`;
                    const isLast = i === segments.length - 1;
                    crumbs.push({
                        label: formatSegmentLabel(segment),
                        href: isLast ? undefined : accumulated,
                    });
                }
            }
            return crumbs;
        }

        const crumbs: BreadcrumbEntry[] = [];
        let accumulated = '';
        segments.forEach((segment, index) => {
            accumulated += `/${segment}`;
            const isLast = index === segments.length - 1;
            crumbs.push({
                label: formatSegmentLabel(segment),
                href: isLast ? undefined : accumulated,
            });
        });
        return crumbs;
    })();

    const memberships =
        (user as unknown as { memberships?: Array<{ role?: string }> })
            ?.memberships ?? [];
    const canDeleteDocument = memberships.some((membership) => {
        const role = membership?.role?.toLowerCase();
        return role === 'owner' || role === 'admin';
    });

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(documentName ?? '');
    const titleInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isEditingTitle) {
            setTitleDraft(documentName ?? '');
        }
    }, [documentName, isEditingTitle]);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const beginEditingTitle = useCallback(() => {
        if (!documentHeaderData?.documentId || isLoadingDoc) {
            return;
        }
        setIsEditingTitle(true);
    }, [documentHeaderData?.documentId, isLoadingDoc]);

    const cancelEditingTitle = useCallback(() => {
        setTitleDraft(documentName ?? '');
        setIsEditingTitle(false);
    }, [documentName]);

    const handleRenameSubmit = useCallback(async () => {
        if (!documentHeaderData?.documentId) {
            setIsEditingTitle(false);
            return;
        }

        const trimmedDraft = titleDraft.trim();
        const currentTitle = (documentName ?? '').trim();

        if (!trimmedDraft) {
            cancelEditingTitle();
            return;
        }

        if (trimmedDraft === currentTitle) {
            setIsEditingTitle(false);
            return;
        }

        try {
            renameDocument(documentHeaderData.documentId, trimmedDraft);
            setDocumentHeaderData((prev) =>
                prev && prev.documentId === documentHeaderData.documentId
                    ? { ...prev, title: trimmedDraft }
                    : prev
            );
            setIsEditingTitle(false);
        } catch {
            // leave the input open so the user can retry
        }
    }, [
        cancelEditingTitle,
        documentHeaderData,
        documentName,
        renameDocument,
        setDocumentHeaderData,
        titleDraft,
    ]);

    const handleRenameKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                void handleRenameSubmit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelEditingTitle();
            }
        },
        [cancelEditingTitle, handleRenameSubmit]
    );

    return (
        <header className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="mx-auto flex flex-col pl-4 pr-4">
                <div className="flex flex-wrap items-center justify-between gap-1 h-9">
                    <div className="flex flex-wrap items-center gap-2">
                        {user && showSidebarTrigger && isSidebarCollapsed ? (
                            <SidebarTrigger className="-ml-2" />
                        ) : null}
                        <Breadcrumb>
                            <BreadcrumbList className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                                {breadcrumbs.map((crumb, index) => {
                                    const isLast =
                                        index === breadcrumbs.length - 1;
                                    const shouldShowSkeleton =
                                        crumb.isDocumentTitle && isLoadingDoc;
                                    const isEditableDocumentTitle =
                                        crumb.isDocumentTitle &&
                                        isDocumentContext &&
                                        !shouldShowSkeleton;
                                    const labelClass = crumb.accent
                                        ? 'text-base font-semibold tracking-tight text-foreground'
                                        : isLast
                                        ? 'text-xs font-medium text-foreground'
                                        : 'text-xs font-medium text-muted-foreground';

                                    return (
                                        <Fragment
                                            key={`${crumb.label}-${index}`}
                                        >
                                            <BreadcrumbItem>
                                                {crumb.href && !isLast ? (
                                                    <BreadcrumbLink asChild>
                                                        <Link
                                                            href={crumb.href}
                                                            className={`${labelClass} transition-colors hover:text-primary`}
                                                        >
                                                            {crumb.label}
                                                        </Link>
                                                    </BreadcrumbLink>
                                                ) : (
                                                    <BreadcrumbPage
                                                        className={labelClass}
                                                    >
                                                        {shouldShowSkeleton ? (
                                                            <Skeleton className="h-5 w-40 rounded bg-emerald-200/60" />
                                                        ) : isEditableDocumentTitle ? (
                                                            isEditingTitle ? (
                                                                <Input
                                                                    ref={
                                                                        titleInputRef
                                                                    }
                                                                    value={
                                                                        titleDraft
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setTitleDraft(
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    onBlur={() => {
                                                                        void handleRenameSubmit();
                                                                    }}
                                                                    onKeyDown={
                                                                        handleRenameKeyDown
                                                                    }
                                                                    disabled={
                                                                        renamePending
                                                                    }
                                                                    className="h-7  border-border bg-background/80 px-2 text-xs font-medium text-foreground"
                                                                />
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        beginEditingTitle
                                                                    }
                                                                    className="inline-flex items-center gap-1 rounded-sm text-left text-inherit outline-none transition hover:text-primary focus-visible:ring-1 focus-visible:ring-ring"
                                                                    disabled={
                                                                        renamePending
                                                                    }
                                                                    title="Rename document"
                                                                >
                                                                    <span className="truncate">
                                                                        {
                                                                            crumb.label
                                                                        }
                                                                    </span>
                                                                    <PencilLine className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </button>
                                                            )
                                                        ) : (
                                                            crumb.label
                                                        )}
                                                    </BreadcrumbPage>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast ? (
                                                <BreadcrumbSeparator />
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    {isDocumentRoute ? (
                        isLoadingDoc ? (
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-20 rounded-md bg-emerald-200/60" />
                                <Skeleton className="h-8 w-24 rounded-md bg-emerald-200/60" />
                                <Skeleton className="h-8 w-8 rounded-md bg-emerald-200/60" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
                                    {isLoadingDoc ? (
                                        <Skeleton className="h-4 w-32 rounded-full bg-emerald-200/60" />
                                    ) : (
                                        <>{statusLabel}</>
                                    )}
                                </div>
                                <div className="hidden items-center gap-2 md:flex">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                    >
                                        <Star
                                            className={`h-4 w-4 ${
                                                isFavorited
                                                    ? 'fill-current text-green-600'
                                                    : ''
                                            }`}
                                        />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                        onClick={documentHeaderData?.onEditTags}
                                        disabled={
                                            !documentHeaderData?.onEditTags
                                        }
                                    >
                                        <TagIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">
                                                    More actions
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48"
                                        >
                                            {canDeleteDocument ? (
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    disabled={
                                                        !documentHeaderData?.onDeleteDocument
                                                    }
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        documentHeaderData?.onDeleteDocument?.();
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Document
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">
                                                    Document actions
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-48"
                                        >
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                    {statusLabel}
                                                </div>
                                            </div>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem>
                                                <Star
                                                    className={`mr-2 h-4 w-4 ${
                                                        isFavorited
                                                            ? 'fill-current text-green-600'
                                                            : ''
                                                    }`}
                                                />
                                                Favorite
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                disabled={
                                                    !documentHeaderData?.onEditTags
                                                }
                                                onSelect={(event) => {
                                                    event.preventDefault();
                                                    documentHeaderData?.onEditTags?.();
                                                }}
                                            >
                                                <TagIcon className="mr-2 h-4 w-4" />
                                                Edit tags
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Share2 className="mr-2 h-4 w-4" />
                                                Share
                                            </DropdownMenuItem>
                                            {canDeleteDocument ? (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        disabled={
                                                            !documentHeaderData?.onDeleteDocument
                                                        }
                                                        onSelect={(event) => {
                                                            event.preventDefault();
                                                            documentHeaderData?.onDeleteDocument?.();
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete document
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    ) : null}
                </div>
                {isDocumentRoute ? (
                    <div className="flex flex-wrap items-center gap-2 pb-2">
                        {isLoadingDoc ? (
                            <>
                                <Skeleton className="h-4 w-28 rounded-full bg-emerald-200/60" />
                                <Skeleton className="h-4 w-20 rounded-full bg-emerald-200/60" />
                            </>
                        ) : documentTags.length > 0 ? (
                            documentTags.map((tag) => (
                                <TagBadge
                                    key={tag.id}
                                    tag={tag}
                                    className="text-xs"
                                />
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                No tags yet
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
            <Separator />
        </header>
    );
}

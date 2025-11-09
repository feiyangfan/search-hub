'use client';

import Link from 'next/link';
import type { Session } from 'next-auth';
import { usePathname } from 'next/navigation';
import {
    MoreHorizontal,
    Share2,
    Star,
    Tag as TagIcon,
    Trash2,
} from 'lucide-react';

import { Fragment, useMemo } from 'react';

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
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tag as TagBadge } from '@/components/ui/tag';
import { useDocumentHeader } from '@/components/document/document-header-context';
import { Skeleton } from '../ui/skeleton';

interface AppHeaderProps {
    session: Session | null;
    showSidebarTrigger?: boolean;
}

export function AppHeader({
    session,
    showSidebarTrigger = true,
}: AppHeaderProps) {
    const user = session?.user;
    const pathname = usePathname();
    const isDocumentRoute = pathname?.startsWith('/doc/');
    const segments =
        pathname?.split('/').filter((segment) => segment.length > 0) ?? [];
    const { data: documentHeaderData } = useDocumentHeader();

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
            return `Last edited ${rtf.format(-diffSeconds, 'second')}`;
        }
        const diffMinutes = Math.round(diffSeconds / 60);
        if (Math.abs(diffMinutes) < 60) {
            return `Last edited ${rtf.format(-diffMinutes, 'minute')}`;
        }
        const diffHours = Math.round(diffMinutes / 60);
        if (Math.abs(diffHours) < 24) {
            return `Last edited ${rtf.format(-diffHours, 'hour')}`;
        }
        const diffDays = Math.round(diffHours / 24);
        if (Math.abs(diffDays) < 7) {
            return `Last edited ${rtf.format(-diffDays, 'day')}`;
        }
        const diffWeeks = Math.round(diffDays / 7);
        if (Math.abs(diffWeeks) < 5) {
            return `Last edited ${rtf.format(-diffWeeks, 'week')}`;
        }
        const diffMonths = Math.round(diffDays / 30);
        if (Math.abs(diffMonths) < 12) {
            return `Last edited ${rtf.format(-diffMonths, 'month')}`;
        }
        const diffYears = Math.round(diffDays / 365);
        return `Last edited ${rtf.format(-diffYears, 'year')}`;
    }, [documentHeaderData?.updatedAt]);
    const statusLabel =
        documentHeaderData?.statusLabel ??
        lastEditedLabel ??
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
        const baseCrumb: BreadcrumbEntry = {
            label: 'Search Hub',
            href: user ? '/dashboard' : '/',
            accent: true,
        };

        if (!segments.length) {
            return [baseCrumb];
        }

        if (segments[0] === 'dashboard') {
            if (segments.length === 1) {
                return [baseCrumb, { label: 'Dashboard Overview' }];
            }

            const crumbs = [
                baseCrumb,
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
            const crumbs = [
                baseCrumb,
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

        const crumbs = [baseCrumb];
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

    return (
        <header className="sticky top-0 z-10 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="mx-auto flex flex-col px-3 pt-3 pb-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {user && showSidebarTrigger ? (
                            <SidebarTrigger className="-ml-2" />
                        ) : null}
                        <Breadcrumb>
                            <BreadcrumbList className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                                {breadcrumbs.map((crumb, index) => {
                                    const isLast =
                                        index === breadcrumbs.length - 1;
                                    const shouldShowSkeleton =
                                        crumb.isDocumentTitle && isLoadingDoc;
                                    const labelClass = crumb.accent
                                        ? 'text-lg font-semibold tracking-tight text-foreground'
                                        : isLast
                                        ? 'text-sm font-medium text-foreground'
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
                        {isDocumentRoute ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {isLoadingDoc ? (
                                    <Skeleton className="h-4 w-32 rounded-full bg-emerald-200/60" />
                                ) : (
                                    <>
                                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                        {statusLabel}
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
                {/* Document Header */}
                {isDocumentRoute ? (
                    isLoadingDoc ? (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-5 w-48 bg-emerald-200/60" />
                            <Skeleton className="h-4 w-24 rounded-full bg-emerald-200/60" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {documentTags.length > 0 ? (
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
                            <div className="flex items-center gap-2">
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
                                    {isFavorited ? 'Favorited' : 'Favorite'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={documentHeaderData?.onEditTags}
                                    disabled={!documentHeaderData?.onEditTags}
                                >
                                    <TagIcon className="h-4 w-4" />
                                    Edit Tags
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1"
                                >
                                    <Share2 className="h-4 w-4" />
                                    Share
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
                                                    Delete Document
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
            <Separator />
        </header>
    );
}

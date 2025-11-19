'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { useDocumentHeader } from '@/components/document/document-header-context';

const BASE_TITLE = 'Search Hub';
const DASHBOARD_TITLE = 'Dashboard';
const DOCUMENTS_TITLE = 'Documents';
const FALLBACK_DOCUMENT_TITLE = 'Document';

export function TabTitleUpdater() {
    const pathname = usePathname() ?? '';
    const { data: documentHeaderData } = useDocumentHeader();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const normalizedPathname = pathname || '';

        const setTitle = (title: string) => {
            window.document.title = title;
        };

        if (normalizedPathname.startsWith('/doc/')) {
            const docTitle = documentHeaderData?.title?.trim();
            setTitle(
                docTitle && docTitle.length > 0
                    ? docTitle
                    : FALLBACK_DOCUMENT_TITLE
            );
            return;
        }

        if (
            normalizedPathname === '/dashboard' ||
            normalizedPathname.startsWith('/dashboard/')
        ) {
            setTitle(DASHBOARD_TITLE);
            return;
        }

        if (
            normalizedPathname === '/documents' ||
            normalizedPathname.startsWith('/documents/')
        ) {
            setTitle(DOCUMENTS_TITLE);
            return;
        }

        setTitle(BASE_TITLE);
    }, [pathname, documentHeaderData?.title]);

    return null;
}

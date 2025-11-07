'use client';

import { useEffect } from 'react';
import type { DocumentHeaderData } from './document-header-context';
import { useDocumentHeader } from './document-header-context';

export function DocumentHeaderHydrator({
    data,
}: {
    data: DocumentHeaderData | null;
}) {
    const { setData } = useDocumentHeader();

    useEffect(() => {
        setData(data);
        return () => {
            setData(null);
        };
    }, [data, setData]);

    return null;
}

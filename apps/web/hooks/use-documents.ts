'use client';

import { useEffect, useState } from 'react';
import type { DocumentListItemType } from '@search-hub/schemas';

type Status = 'idle' | 'loading' | 'done' | 'error';

export function useDocuments(params?: { favoritesOnly?: boolean }) {
    const [status, setStatus] = useState<Status>('idle');
    const [items, setItems] = useState<DocumentListItemType[]>([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string>();

    useEffect(() => {
        const controller = new AbortController();
        const qs = new URLSearchParams();
        if (params?.favoritesOnly) qs.set('favoritesOnly', 'true');

        setStatus('loading');
        fetch(`/api/documents${qs.size ? `?${qs}` : ''}`, {
            signal: controller.signal,
            credentials: 'include',
        })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                return res.json();
            })
            .then(
                (body: {
                    documents: { items: DocumentListItemType[]; total: number };
                }) => {
                    console.log('body', body);
                    setItems(body.documents.items);
                    setTotal(body.documents.total);
                    setStatus('done');
                    setError(undefined);
                }
            )
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setStatus('error');
                setError(err.message ?? 'Failed to load documents');
            });

        return () => controller.abort();
    }, [params?.favoritesOnly]);

    return { status, items, total, error };
}

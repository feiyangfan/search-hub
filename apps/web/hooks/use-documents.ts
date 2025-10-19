'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DocumentListItemType } from '@search-hub/schemas';

type Status = 'idle' | 'loading' | 'done' | 'error';

type UseDocumentsParams = {
    favoritesOnly?: boolean;
    limit?: number;
};

type DocumentsResponse = {
    documents: { items: DocumentListItemType[]; total: number };
};

export function useDocuments({
    favoritesOnly = false,
    limit = 10,
}: UseDocumentsParams = {}) {
    const [status, setStatus] = useState<Status>('idle');
    const [items, setItems] = useState<DocumentListItemType[]>([]);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string>();
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const buildQuery = useCallback(
        (nextOffset: number) => {
            const qs = new URLSearchParams();
            qs.set('limit', String(limit));
            qs.set('offset', String(nextOffset));
            if (favoritesOnly) {
                qs.set('favoritesOnly', 'true');
            }
            return qs.toString();
        },
        [favoritesOnly, limit]
    );

    useEffect(() => {
        const controller = new AbortController();

        async function fetchInitial() {
            setStatus('loading');
            setError(undefined);
            try {
                const res = await fetch(
                    `/api/documents?${buildQuery(0)}`,
                    {
                        signal: controller.signal,
                        credentials: 'include',
                    }
                );
                if (!res.ok) {
                    throw new Error(await res.text());
                }
                const body = (await res.json()) as DocumentsResponse;
                setItems(body.documents.items);
                setTotal(body.documents.total);
                setOffset(body.documents.items.length);
                setStatus('done');
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    return;
                }
                setItems([]);
                setTotal(0);
                setStatus('error');
                setError(
                    (err as Error).message ?? 'Failed to load documents'
                );
            }
        }

        setItems([]);
        setTotal(0);
        setOffset(0);
        fetchInitial();

        return () => {
            controller.abort();
        };
    }, [buildQuery]);

    const hasMore = useMemo(
        () => items.length < total,
        [items.length, total]
    );

    const loadMore = useCallback(async () => {
        if (isLoadingMore || status === 'loading' || !hasMore) {
            return;
        }

        setIsLoadingMore(true);
        try {
            const res = await fetch(
                `/api/documents?${buildQuery(offset)}`,
                {
                    credentials: 'include',
                }
            );
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const body = (await res.json()) as DocumentsResponse;
            setItems((prev) => [...prev, ...body.documents.items]);
            setTotal(body.documents.total);
            setOffset((prevOffset) => prevOffset + body.documents.items.length);
            setError(undefined);
            setStatus('done');
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                return;
            }
            setError(
                (err as Error).message ?? 'Failed to load documents'
            );
        } finally {
            setIsLoadingMore(false);
        }
    }, [buildQuery, hasMore, isLoadingMore, offset, status]);

    return {
        status,
        items,
        total,
        error,
        loadMore,
        hasMore,
        isLoadingMore,
    };
}

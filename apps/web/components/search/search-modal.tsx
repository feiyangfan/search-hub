'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import type { SearchResultItem } from '@search-hub/schemas';
import { useSearch } from './search-provider';
import { useInvalidateSearchAnalytics } from '@/hooks/use-dashboard';

function tokenize(query: string) {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function isMeaningfulQuery(value: string) {
    const tokens = tokenize(value);
    const meaningful = tokens.filter((t) => t.length > 3);
    return meaningful.length > 0;
}

interface SearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
    const router = useRouter();
    const { initialQuery } = useSearch();
    const invalidateSearchAnalytics = useInvalidateSearchAnalytics();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [noStrongMatches, setNoStrongMatches] = useState(false);

    const performSearch = useDebouncedCallback(
        async (searchQuery: string, type: 'lexical' | 'hybrid' = 'hybrid') => {
            if (!searchQuery.trim() || !isMeaningfulQuery(searchQuery)) {
                setResults([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(
                        searchQuery
                    )}&type=${type}`
                );
                if (!response.ok) {
                    throw new Error('Search request failed');
                }
                const data = await response.json();
                // Backend returns SearchResponse: { total, items, page?, pageSize? }
                if (data.items && Array.isArray(data.items)) {
                    setResults(data.items);
                    setNoStrongMatches(Boolean(data.noStrongMatches));
                    // Invalidate search analytics cache to update recent searches and intelligence cards
                    invalidateSearchAnalytics();
                }
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
                setNoStrongMatches(false);
            } finally {
                setIsLoading(false);
            }
        },
        1000
    );

    useEffect(() => {
        // Always use hybrid search for typing and submit
        if (query.trim() && isMeaningfulQuery(query)) {
            performSearch(query, 'hybrid');
        } else {
            setResults([]);
            setNoStrongMatches(false);
        }
    }, [query, performSearch]);

    // Set initial query when modal opens
    useEffect(() => {
        if (open && initialQuery) {
            setQuery(initialQuery);
        }
    }, [open, initialQuery]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
        }
    }, [open]);

    const handleSelect = (documentId: string) => {
        onOpenChange(false);
        router.push(`/doc/${documentId}`);
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            shouldFilter={false}
        >
            <CommandInput
                placeholder="Search documents..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    {isLoading
                        ? 'Searching...'
                        : noStrongMatches
                        ? 'No strong matches. Try a more specific query.'
                        : 'No documents found.'}
                </CommandEmpty>
                {results.length > 0 && (
                    <CommandGroup heading="Results">
                        {results.map((result) => (
                            <CommandItem
                                key={result.id}
                                value={result.id}
                                onSelect={() => handleSelect(result.id)}
                                className="flex flex-col items-start gap-1"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="font-medium truncate">
                                        {result.title}
                                    </span>
                                    {result.score !== undefined && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {result.score.toFixed(3)}
                                        </span>
                                    )}
                                </div>
                                {result.snippet && (
                                    <p
                                        className="text-xs text-muted-foreground line-clamp-2 pl-6 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-900 [&_mark]:font-semibold"
                                        dangerouslySetInnerHTML={{
                                            __html: result.snippet,
                                        }}
                                    />
                                )}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Microscope } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
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
    const meaningful = tokens.filter((t) => t.length >= 3);
    return meaningful.length > 0;
}

const qaSources = [
    {
        id: 'doc-binary-search',
        title: 'Binary Search',
        snippet:
            'When to use each template and how the boundaries shift for exact match vs first-true.',
    },
    {
        id: 'doc-sorted-arrays',
        title: 'Searching Sorted Arrays',
        snippet:
            'Divide and conquer approach to reduce search space from O(n) to O(log n).',
    },
    {
        id: 'doc-algorithms-playbook',
        title: 'Algorithms Playbook',
        snippet:
            'Binary search invariants and common pitfalls when choosing mid.',
    },
];

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
            contentClassName="sm:max-w-[50vw] h-[70vh] max-h-[80vh]"
        >
            <CommandInput
                placeholder="Search documents..."
                value={query}
                onValueChange={setQuery}
            />
            {isMeaningfulQuery(query) ? (
                <div className="flex items-center gap-1 px-3 py-2">
                    <Button type="button" variant="ghost">
                        <Microscope className="mr-1 h-3 w-3" />
                        Search with HubAI
                        <p className="text-[0.7rem] text-muted-foreground">
                            Uses your workspace sources for answers.
                        </p>
                    </Button>
                </div>
            ) : null}
            <CommandList className="max-h-none flex-1">
                {isMeaningfulQuery(query) ? (
                    <CommandGroup heading="HubAI answer">
                        <div className="px-2 py-3 text-sm leading-relaxed text-foreground">
                            <div className="space-y-2">
                                <p>
                                    HubAI placeholder: This answer summarizes
                                    the key idea based on your workspace
                                    sources. It will include citations and
                                    follow-ups once the QA endpoint is wired.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Uses your workspace sources for answers.
                                </p>
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Sources
                                    </p>
                                    <div className="space-y-1.5">
                                        {qaSources.map((source, index) => (
                                            <button
                                                key={source.id}
                                                type="button"
                                                onClick={() =>
                                                    handleSelect(source.id)
                                                }
                                                className="w-full rounded-md border border-border/40 bg-muted/20 p-2 text-left transition-colors hover:bg-muted/40"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-foreground">
                                                        [{index + 1}]{' '}
                                                        {source.title}
                                                    </p>
                                                    <span className="text-[0.65rem] text-muted-foreground">
                                                        Open
                                                    </span>
                                                </div>
                                                <p className="text-[0.7rem] text-muted-foreground line-clamp-2">
                                                    {source.snippet}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CommandGroup>
                ) : null}
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

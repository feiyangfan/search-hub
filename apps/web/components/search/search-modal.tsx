'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Sparkles } from 'lucide-react';
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
import { Button } from '../ui/button';
import { useSearch } from './search-provider';
import { useInvalidateSearchAnalytics } from '@/hooks/use-dashboard';

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
    const [searchType, setSearchType] = useState<'lexical' | 'hybrid'>(
        'lexical'
    );

    const performSearch = useDebouncedCallback(
        async (searchQuery: string, type: 'lexical' | 'hybrid' = 'lexical') => {
            if (!searchQuery.trim()) {
                setResults([]);
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
                    // Invalidate search analytics cache to update recent searches and intelligence cards
                    invalidateSearchAnalytics();
                }
            } catch (error) {
                console.error('Search failed:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        },
        300
    );

    useEffect(() => {
        // Always use lexical search for real-time typing
        if (query.trim()) {
            setSearchType('lexical');
            performSearch(query, 'lexical');
        } else {
            setResults([]);
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
            setSearchType('lexical');
        }
    }, [open]);

    const handleSmartSearch = () => {
        if (query.trim()) {
            setSearchType('hybrid');
            performSearch(query, 'hybrid');
        }
    };

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
            {query.trim() && searchType === 'lexical' && (
                <div className="px-2 py-1.5 border-b">
                    <Button
                        onClick={handleSmartSearch}
                        disabled={isLoading}
                        variant={'outline'}
                        className="flex items-center gap-2  px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Sparkles className="h-4 w-4" />
                        <span>Smart Search with AI</span>
                    </Button>
                </div>
            )}
            <CommandList>
                <CommandEmpty>
                    {isLoading ? 'Searching...' : 'No documents found.'}
                </CommandEmpty>
                {results.length > 0 && (
                    <CommandGroup
                        heading={
                            searchType === 'hybrid'
                                ? 'Smart Results'
                                : 'Documents'
                        }
                    >
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

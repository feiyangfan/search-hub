'use client';

import { useState, type KeyboardEvent } from 'react';
import { Search, Clock } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearch } from '@/components/search/search-provider';
import {
    useRecentSearchesQuery,
    useInvalidateSearchAnalytics,
} from '@/hooks/use-dashboard';

interface QuickSearchCardProps {
    tenantId: string | undefined;
}

export function QuickSearchCard({ tenantId }: QuickSearchCardProps) {
    const [inputValue, setInputValue] = useState('');
    const { openSearch } = useSearch();
    const invalidateSearchAnalytics = useInvalidateSearchAnalytics();
    const { data: recentSearchesData, isLoading } = useRecentSearchesQuery(
        tenantId,
        3
    );

    const recentSearches = recentSearchesData?.searches || [];

    const handleSearch = () => {
        if (inputValue.trim()) {
            openSearch(inputValue);
            // Invalidate cache to ensure analytics update after search modal closes
            setTimeout(() => invalidateSearchAnalytics(), 500);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleRecentSearchClick = (term: string) => {
        setInputValue(term);
        openSearch(term);
        // Invalidate cache to ensure analytics update after search modal closes
        setTimeout(() => invalidateSearchAnalytics(), 500);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="Search documents..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!inputValue.trim()}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Recent searches:
                    </p>
                    <div className="flex flex-row gap-2">
                        <Skeleton className="h-7 w-24 rounded" />
                        <Skeleton className="h-7 w-20 rounded" />
                        <Skeleton className="h-7 w-28 rounded" />
                    </div>
                </div>
            ) : recentSearches.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Recent searches:
                    </p>
                    <div className="flex flex-row gap-2">
                        {recentSearches.map((query, idx) => (
                            <Button
                                key={`${query}-${idx}`}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecentSearchClick(query)}
                                className="text-xs"
                            >
                                {query}
                            </Button>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

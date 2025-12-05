'use client';

import { useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/components/search/search-provider';

const RECENT_SEARCHES = ['authentication', 'deployment', 'api docs'];

export function QuickSearchCard() {
    const [inputValue, setInputValue] = useState('');
    const { openSearch } = useSearch();

    const handleSearch = () => {
        if (inputValue.trim()) {
            openSearch(inputValue);
            // Keep the input value so user can see what they searched for
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

            {RECENT_SEARCHES.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Recent searches:
                    </p>
                    <div className="flex flex-row gap-2">
                        {RECENT_SEARCHES.map((term) => (
                            <Button
                                key={term}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecentSearchClick(term)}
                                className="text-xs"
                            >
                                {term}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

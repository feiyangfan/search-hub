'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

interface SearchContextType {
    isOpen: boolean;
    initialQuery: string;
    setIsOpen: (open: boolean) => void;
    openSearch: (query?: string) => void;
    closeSearch: () => void;
    toggleSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [initialQuery, setInitialQuery] = useState('');

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const openSearch = (query = '') => {
        setInitialQuery(query);
        setIsOpen(true);
    };

    const closeSearch = () => {
        setIsOpen(false);
        // Clear initial query after a delay to avoid flicker when modal closes
        setTimeout(() => setInitialQuery(''), 300);
    };

    const toggleSearch = () => setIsOpen((open) => !open);

    return (
        <SearchContext.Provider
            value={{
                isOpen,
                initialQuery,
                setIsOpen,
                openSearch,
                closeSearch,
                toggleSearch,
            }}
        >
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (context === undefined) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}

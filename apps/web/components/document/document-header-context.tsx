'use client';

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
    type Dispatch,
    type SetStateAction,
} from 'react';
import type { TagOption } from '@/components/ui/tag';

export type DocumentHeaderData = {
    documentId: string;
    title: string;
    isFavorited: boolean;
    tags: TagOption[];
    updatedAt?: string | null;
    statusLabel?: string | null;
    onEditTags?: () => void;
    onDeleteDocument?: () => void;
};

type DocumentHeaderContextValue = {
    data: DocumentHeaderData | null;
    setData: Dispatch<SetStateAction<DocumentHeaderData | null>>;
};

const DocumentHeaderContext = createContext<DocumentHeaderContextValue | null>(
    null
);

export function DocumentHeaderProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [data, setData] = useState<DocumentHeaderData | null>(null);

    const value = useMemo(
        () => ({
            data,
            setData,
        }),
        [data]
    );

    return (
        <DocumentHeaderContext.Provider value={value}>
            {children}
        </DocumentHeaderContext.Provider>
    );
}

export function useDocumentHeader() {
    const context = useContext(DocumentHeaderContext);
    if (!context) {
        throw new Error(
            'useDocumentHeader must be used within a DocumentHeaderProvider'
        );
    }
    return context;
}

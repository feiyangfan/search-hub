import Link from 'next/link';
import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { EditorHeader } from '@/components/document-editor/editor-header';
import { DocumentEditor } from '@/components/document-editor/editor';

export default function DocumentPage() {
    return (
        <div className="flex flex-1 flex-col">
            <EditorHeader
                title="Untitled document"
                lastSavedLabel="Saved just now"
                isFavorited={false}
            />
            <DocumentEditor initialMarkdown="#Untitled page" />
        </div>
    );
}

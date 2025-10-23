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

import { EditorHeader } from '@/components/editor/editor-header';

export default function DocumentEditorPlaceholderPage() {
    return (
        <div className="flex flex-1 flex-col">
            <EditorHeader
                title="Untitled document"
                lastSavedLabel="Saved just now"
                isFavorited={false}
            />
            <div className="flex flex-1 items-center justify-center px-6 py-16">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="items-center text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <FileText className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">
                            Markdown editor coming soon
                        </CardTitle>
                        <CardDescription>
                            This route will host the live markdown editor with
                            autosave, command parsing, and draft controls.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
                        <p>
                            When the editor ships, you&apos;ll be redirected
                            here automatically after creating a draft document.
                        </p>
                        <p>
                            For now, use the navigation to explore other parts
                            of the dashboard or return to the creation landing
                            page.
                        </p>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button asChild variant="default">
                                <Link href="/dashboard/documents/new">
                                    Back to creation options
                                </Link>
                            </Button>
                            <Button asChild variant="ghost">
                                <Link href="/dashboard">
                                    Return to dashboard
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

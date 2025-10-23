import Link from 'next/link';
import { Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentImportPlaceholderPage() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
            <Card className="w-full max-w-2xl">
                <CardHeader className="items-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Link2 className="size-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Link import is on the way</CardTitle>
                    <CardDescription>
                        Soon you&apos;ll be able to paste a URL and automatically generate a document draft with
                        summaries, citations, and metadata.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
                    <p>
                        This placeholder route confirms that navigation is wired. We&apos;ll connect the parsing
                        service and draft creation pipeline in an upcoming release.
                    </p>
                    <p>
                        In the meantime, you can start from scratch using the markdown editor entry point.
                    </p>
                    <div className="flex justify-center gap-3 pt-2">
                        <Button asChild variant="default">
                            <Link href="/dashboard/documents/new/editor">Open editor placeholder</Link>
                        </Button>
                        <Button asChild variant="ghost">
                            <Link href="/dashboard/documents/new">Back to creation options</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import Link from 'next/link';
import { FilePlus2, Link2 } from 'lucide-react';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

export default function NewDocumentLandingPage() {
    return (
        <div className="space-y-10 px-6 pb-16 pt-10">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 text-center sm:text-left">
                <Badge variant="outline" className="self-center sm:self-start">
                    Create document
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Choose how you want to capture knowledge
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                    Start with a blank canvas or import an external source. You
                    can connect other creation options here later.
                </p>
            </div>

            <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
                <Card className="border">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <FilePlus2 className="size-5 text-primary" />
                            Start from scratch
                        </CardTitle>
                        <CardDescription>
                            Open the markdown editor to begin writing a new
                            document. Autosave, commands, and publishing
                            controls will live here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>When you continue:</p>
                        <ul className="list-disc space-y-1 pl-4 text-left">
                            <li>A new document will be created instantly.</li>
                            <li>
                                The sidebar will highlight the document for
                                quick access.
                            </li>
                            <li>
                                You&apos;ll see the markdown editor with live
                                preview.
                            </li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/dashboard/documents/new/editor">
                                Open markdown editor
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="border-dashed">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Link2 className="size-5 text-primary" />
                            Import from link
                        </CardTitle>
                        <CardDescription>
                            Paste a URL and we&apos;ll generate a draft from the
                            source. Ideal for blogs, docs, transcripts, and
                            more.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Source url
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    placeholder="https://example.com/article"
                                    className="sm:flex-1"
                                />
                                <Button
                                    variant="secondary"
                                    className="sm:w-32"
                                    disabled
                                    title="Placeholder action"
                                >
                                    Parse link
                                </Button>
                            </div>
                        </div>
                        <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                            <p className="font-medium">What happens next?</p>
                            <ol className="mt-2 space-y-1 pl-4">
                                <li className="list-decimal">
                                    We fetch the page content and extract the
                                    readable text.
                                </li>
                                <li className="list-decimal">
                                    A draft document is created with the source
                                    metadata and summary.
                                </li>
                                <li className="list-decimal">
                                    You review, edit, and publish from the
                                    markdown editor.
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" disabled>
                            <span>Generate document &mdash; coming soon</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <Separator className="mx-auto w-full max-w-5xl" />

            <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Need a different entry point?</CardTitle>
                        <CardDescription>
                            We&apos;ll add more inputs such as file uploads, AI
                            summaries, and templates.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            Select an option above or come back later as more
                            import sources roll out.
                        </p>
                        <p>
                            Have feedback? Drop ideas in the feedback command
                            palette or ping the team directly.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming functionality</CardTitle>
                        <CardDescription>
                            Planned enhancements that will appear on this screen
                            soon.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <ul className="space-y-2">
                            <li>
                                &bull; Upload files for ingestion (PDF, DOCX,
                                text).
                            </li>
                            <li>
                                &bull; Apply templates for recurring document
                                types.
                            </li>
                            <li>
                                &bull; AI-assisted note generation and
                                summaries.
                            </li>
                            <li>
                                &bull; Version history and scheduled publishing.
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

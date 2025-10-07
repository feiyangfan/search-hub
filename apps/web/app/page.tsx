import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

export default async function Page() {
    const stats = [
        { label: 'Documents', value: 500 },
        { label: 'Tenants', value: 2 },
        { label: 'p95 (ms)', value: 0 },
    ];

    const recent: Array<{ id: string; title: string; ts: string }> = [];

    return (
        <div className="flex flex-1 bg-gray-50">
            <div className="mx-auto  px-4 py-6 space-y-6">
                <section className="space-y-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Find knowledge fast
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Upload, index, and search across tenants with hybrid
                        retrieval.
                    </p>
                    <SearchBar />
                </section>

                <Separator />

                {/* 2-column: stats | get started */}
                <section className="grid gap-4 md:grid-cols-3">
                    {/* Stats */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Quick stats</CardTitle>
                            <CardDescription>
                                Snapshot of your workspace
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {stats.map((s) => (
                                    <div
                                        key={s.label}
                                        className="rounded-2xl border bg-background p-4 shadow-[var(--shadow-card)]"
                                    >
                                        <div className="text-sm text-muted-foreground">
                                            {s.label}
                                        </div>
                                        <div className="mt-1 text-2xl font-semibold">
                                            {s.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Get started */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Get started</CardTitle>
                            <CardDescription>
                                First actions to take
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <ol className="list-decimal space-y-2 pl-5">
                                <li>
                                    <Link className="underline" href="/upload">
                                        Upload a document
                                    </Link>
                                </li>
                                <li>Index content (worker)</li>
                                <li>
                                    <Link className="underline" href="/search">
                                        Run your first search
                                    </Link>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </section>

                {/* Recent activity */}
                <section className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Recent activity</CardTitle>
                            <CardDescription>
                                Latest uploads and searches
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recent.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No activity yet.
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {recent.map((r) => (
                                        <li
                                            key={r.id}
                                            className="rounded-xl border bg-background p-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">
                                                    {r.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        r.ts
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>

                    {/* Placeholder for a second card (tips, changelog, links) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tips</CardTitle>
                            <CardDescription>
                                Make the most of Search Hub
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <ul className="list-disc space-y-2 pl-5">
                                <li>Use descriptive titles for uploads</li>
                                <li>Tag documents by tenant & topic</li>
                                <li>Evaluate search quality regularly</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

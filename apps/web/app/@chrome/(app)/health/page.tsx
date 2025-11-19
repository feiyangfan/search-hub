import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

async function getHealth() {
    const res = await fetch('http://localhost:3001/api/health', {
        cache: 'no-store',
    });
    let data: unknown;
    try {
        data = await res.json();
    } catch {
        data = { ok: false };
    }

    return { status: res.status, data };
}

export default async function HealthPage() {
    const { status, data } = await getHealth();
    const isHealthy = status === 200;

    return (
        <div className="flex min-h-full flex-col bg-gray-50">
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
                <section className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        System health
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Live status for the API backing Search Hub across
                        tenants and workloads.
                    </p>
                </section>

                <Separator />

                <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
                    <Card className="flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>API health</CardTitle>
                                <CardDescription>
                                    HTTP response from the operational endpoint
                                </CardDescription>
                            </div>
                            <Badge
                                variant={isHealthy ? 'default' : 'destructive'}
                            >
                                {isHealthy ? 'Healthy' : 'Unhealthy'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <pre className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                            <Button asChild variant="outline">
                                <a
                                    href="/api/health"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open raw JSON
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Response status</CardTitle>
                            <CardDescription>HTTP {status}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            {isHealthy ? (
                                <p>
                                    The connection succeeded and returned a
                                    healthy payload.
                                </p>
                            ) : (
                                <p>
                                    The service is reporting issues. Check logs
                                    and ensure the worker is reachable.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

import { SearchHubClient } from '@search-hub/sdk';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') ?? 't1';
    const q = url.searchParams.get('q') ?? '';
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const apiBase = process.env.API_URL ?? 'http://localhost:3000';
    const client = new SearchHubClient({ baseUrl: apiBase });

    try {
        const data = await client.search({ tenantId, q, limit, offset } as any);
        return Response.json(data, { status: 200 });
    } catch (e: any) {
        return Response.json(
            { error: 'upstream_failed', message: String(e) },
            { status: e.status ?? 500 }
        );
    }
}

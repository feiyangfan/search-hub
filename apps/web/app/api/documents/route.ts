import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';
import { GetDocumentListParams } from '@search-hub/schemas';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const parseResult = GetDocumentListParams.safeParse({
        limit: url.searchParams.get('limit') ?? undefined,
        offset: url.searchParams.get('offset') ?? undefined,
        favoritesOnly: url.searchParams.get('favoritesOnly') ?? undefined,
    });

    if (!parseResult.success) {
        return NextResponse.json(
            { error: 'Invalid query parameters' },
            { status: 400 }
        );
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    try {
        const { documents } = await client.listDocuments(parseResult.data);
        return NextResponse.json({ documents }, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to fetch documents';
        return NextResponse.json({ error: message }, { status });
    }
}

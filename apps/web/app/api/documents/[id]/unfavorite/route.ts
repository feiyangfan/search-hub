import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        const response = await client.unfavoriteDocument(id);
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to unfavorite document';
        return NextResponse.json({ error: message }, { status });
    }
}

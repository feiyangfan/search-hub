import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;

    if (!apiSessionCookie) {
        return NextResponse.json(
            { error: 'No API session available' },
            { status: 401 }
        );
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const includeComparison = searchParams.get('includeComparison') === 'true';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        const data = await client.getSearchMetrics({
            includeComparison,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch search metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch search metrics' },
            { status: 500 }
        );
    }
}

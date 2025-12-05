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
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const daysBack = parseInt(searchParams.get('daysBack') || '7', 10);
        const searchType = searchParams.get('searchType') as
            | 'lexical'
            | 'semantic'
            | 'hybrid'
            | null;
        const includeComparison =
            searchParams.get('includeComparison') === 'true';
        const includePerformance =
            searchParams.get('includePerformance') === 'true';
        const includeUserBehavior =
            searchParams.get('includeUserBehavior') === 'true';
        const includeResponseTime =
            searchParams.get('includeResponseTime') === 'true';
        const topQueriesLimit = parseInt(
            searchParams.get('topQueriesLimit') || '10',
            10
        );
        const topUsersLimit = parseInt(
            searchParams.get('topUsersLimit') || '10',
            10
        );

        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        const data = await client.getDetailedSearchAnalytics({
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
            daysBack,
            ...(searchType && { searchType }),
            includeComparison,
            includePerformance,
            includeUserBehavior,
            includeResponseTime,
            topQueriesLimit,
            topUsersLimit,
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch detailed analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch detailed analytics' },
            { status: 500 }
        );
    }
}

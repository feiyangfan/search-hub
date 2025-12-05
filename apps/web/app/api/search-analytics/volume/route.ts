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
        const granularity = searchParams.get('granularity') as
            | 'hour'
            | 'day'
            | null;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        const client = new SearchHubClient({
            baseUrl: apiBase,
            headers: { cookie: apiSessionCookie },
        });

        const data = await client.getSearchVolume({
            startDate,
            endDate,
            ...(granularity && { granularity }),
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch search volume:', error);
        return NextResponse.json(
            { error: 'Failed to fetch search volume' },
            { status: 500 }
        );
    }
}

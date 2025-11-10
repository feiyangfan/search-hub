import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { SearchHubClient } from '@search-hub/sdk';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenantId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await context.params;
    if (!tenantId) {
        return NextResponse.json(
            { error: 'Tenant id is required' },
            { status: 400 }
        );
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    try {
        const stats = await client.getTenantStats(tenantId);
        return NextResponse.json(stats);
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to fetch workspace stats';
        return NextResponse.json({ error: message }, { status });
    }
}

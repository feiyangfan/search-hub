import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';
import { ActiveTenantPayload } from '@search-hub/schemas';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: ActiveTenantPayload;
    try {
        payload = ActiveTenantPayload.parse(await request.json());
    } catch (err) {
        return NextResponse.json(
            {
                error:
                    (err as { message?: string }).message ??
                    'Invalid request body',
            },
            { status: 400 }
        );
    }

    const apiSessionCookie = session.apiSessionCookie;
    if (!apiSessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    try {
        await client.setActiveTenant(payload);
        return NextResponse.json({ success: true });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to set active workspace';
        return NextResponse.json({ error: message }, { status });
    }
}

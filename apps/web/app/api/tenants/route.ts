import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';
import { CreateTenantPayload } from '@search-hub/schemas';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: CreateTenantPayload;
    try {
        payload = CreateTenantPayload.parse(await request.json());
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
    const name = payload.name.trim();

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    try {
        const tenant = await client.createTenant({ name });
        return NextResponse.json(tenant, { status: 201 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to create workspace';
        return NextResponse.json({ error: message }, { status });
    }
}

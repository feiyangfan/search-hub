import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';
import { CreateTenantPayload, DeleteTenantPayload } from '@search-hub/schemas';

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
        await client.setActiveTenant({ id: tenant.id });
        return NextResponse.json(tenant, { status: 201 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to create workspace';
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: DeleteTenantPayload;
    try {
        payload = DeleteTenantPayload.parse(await request.json());
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
    const tenantId = payload.id;

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
        await client.deleteTenant({ id: tenantId });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to delete workspace';
        return NextResponse.json({ error: message }, { status });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

async function requireClient() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return null;
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        return null;
    }

    const client = new SearchHubClient({
        baseUrl: apiBase,
        headers: { cookie: apiSessionCookie },
    });

    return client;
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const client = await requireClient();
    if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
        return NextResponse.json({ error: 'Missing tag id' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const response = await client.updateTag(id, body);
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ?? 'Failed to update tag';
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const client = await requireClient();
    if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
        return NextResponse.json({ error: 'Missing tag id' }, { status: 400 });
    }

    try {
        await client.deleteTag(id);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ?? 'Failed to delete tag';
        return NextResponse.json({ error: message }, { status });
    }
}

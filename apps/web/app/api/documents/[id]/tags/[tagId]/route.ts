import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string; tagId: string } }
) {
    const { id, tagId } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        const response = await client.removeTagFromDocument(id, tagId);
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message =
            (error as { message?: string }).message ??
            'Failed to remove tag from document';
        return NextResponse.json({ error: message }, { status });
    }
}

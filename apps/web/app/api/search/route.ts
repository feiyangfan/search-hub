import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { SearchHubClient } from '@search-hub/sdk';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export async function GET(req: Request) {
    console.log('[Search API] Received request, API_URL:', apiBase);

    const session = await getServerSession(authOptions);
    if (!session) {
        console.log('[Search API] No session found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiSessionCookie = (session as { apiSessionCookie?: string })
        .apiSessionCookie;
    if (!apiSessionCookie) {
        console.log('[Search API] No API session cookie found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get('q') ?? '';
    const type = url.searchParams.get('type') ?? 'lexical';
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    console.log('[Search API] Query params:', { q, type, limit, offset });

    try {
        console.log(
            '[Search API] Calling backend:',
            apiBase,
            'with query:',
            q,
            'type:',
            type
        );

        // Use lexical or hybrid search based on type parameter
        const endpoint = type === 'hybrid' ? 'search' : 'lexical-search';
        const requestUrl = `${apiBase}/v1/${endpoint}?q=${encodeURIComponent(
            q
        )}&limit=${limit}&offset=${offset}`;

        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                cookie: apiSessionCookie,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Backend request failed: ${response.status} ${errorText}`
            );
        }

        const data = await response.json();
        console.log('[Search API] Backend response:', JSON.stringify(data));
        return NextResponse.json(data, { status: 200 });
    } catch (e) {
        console.error('[Search API] Backend error:', e);
        const status = (e as { status?: number }).status ?? 500;
        const message =
            (e as { message?: string }).message ?? 'Search request failed';
        const errorBody = (e as { body?: unknown }).body;
        return NextResponse.json(
            { error: message, details: errorBody },
            { status }
        );
    }
}

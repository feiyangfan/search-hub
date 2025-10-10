import { NextResponse } from 'next/server';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';
const client = new SearchHubClient({ baseUrl: apiBase });

export async function POST() {
    try {
        await client.signOut();

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('signOut failed', error);
        return NextResponse.json(
            { error: 'Unable to sign out' },
            { status: (error as { status?: number }).status ?? 500 }
        );
    }
}

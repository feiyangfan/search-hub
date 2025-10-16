import { AuthPayload } from '@search-hub/schemas';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, z } from 'zod';
import { SearchHubClient } from '@search-hub/sdk';

const apiBase = process.env.API_URL ?? 'http://localhost:3000';
const client = new SearchHubClient({ baseUrl: apiBase });

export async function POST(request: NextRequest) {
    try {
        const payload = AuthPayload.parse(await request.json());

        const res = await client.signUp(payload);

        return NextResponse.json(res, { status: 201 });
    } catch (error) {
        if (error instanceof ZodError) {
            const { fieldErrors, formErrors } = z.flattenError(error);

            // console.log(z.prettifyError(error));
            const issues = [
                ...formErrors.map((message) => ({ path: 'root', message })),
                ...Object.entries(
                    fieldErrors as Record<string, string[] | undefined>
                ).flatMap(([field, messages]) =>
                    (messages ?? []).map((message) => ({
                        path: field,
                        message,
                    }))
                ),
            ];

            return NextResponse.json(
                {
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'Request validation failed',
                    },
                    issues,
                },
                { status: 400 }
            );
        }
        if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            const upstreamBody = (error as { body?: unknown }).body;

            return NextResponse.json(
                upstreamBody ?? {
                    error: 'upstream_error',
                    message: error instanceof Error ? error.message : '',
                },
                { status }
            );
        }

        return NextResponse.json(
            {
                error: 'unknown_error',
                message: 'Unable to process sign up request',
            },
            { status: 500 }
        );
    }
}

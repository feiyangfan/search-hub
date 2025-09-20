export const runtime = 'nodejs';

export async function GET() {
    const base = process.env.API_URL ?? 'http://localhost:3000';
    try {
        const r = await fetch(`${base}/health`, { cache: 'no-store' });
        const data = await r
            .json()
            .catch(() => ({ ok: false, note: 'non-json response' }));
        return new Response(JSON.stringify(data), {
            status: r.status,
            headers: { 'content-type': 'application/json' },
        });
    } catch {
        return new Response(
            JSON.stringify({ ok: false, error: 'upstream_unreachable' }),
            {
                status: 502,
                headers: { 'content-type': 'application/json' },
            }
        );
    }
}

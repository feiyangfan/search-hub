import { loadAiEnv } from '@search-hub/config-env';

type VoyageRerankModel = 'rerank-2.5-lite';

const env = loadAiEnv();
const VOYAGE_API_KEY = env.VOYAGE_API_KEY!;
const DEFAULT_MODEL: VoyageRerankModel = 'rerank-2.5-lite';

/**
 * Rerank candidates by relevance to the query.
 * Returns indexes into the original array and their scores (higher = better).
 */
export async function voyageRerank(
    query: string,
    documents: string[],
    model: VoyageRerankModel = DEFAULT_MODEL
): Promise<{ index: number; score: number }[]> {
    if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY is missing');
    if (documents.length === 0) return [];

    const resp = await fetch('https://api.voyageai.com/v1/rerank', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${VOYAGE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, query, documents }),
    });

    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Voyage rerank failed: ${resp.status} ${t}`);
    }

    const json: any = await resp.json();
    // json.data = [{ index: number, relevance_score: number, ... }, ...]
    return (json?.data ?? []).map((d: any) => ({
        index: d.index as number,
        score: (d.relevance_score as number) ?? 0,
    }));
}

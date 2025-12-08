/**
 * Rerank candidates by relevance to the query.
 * Returns indexes into the original array and their scores (higher = better).
 */
export async function voyageRerank(
    apiKey: string,
    query: string,
    documents: string[]
): Promise<{ index: number; score: number }[]> {
    const model = 'rerank-2.5';
    if (documents.length === 0) return [];

    const resp = await fetch('https://api.voyageai.com/v1/rerank', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, query, documents }),
    });

    if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`Voyage rerank failed: ${resp.status} ${t}`);
    }

    interface VoyageRerankResult {
        data?: {
            index: number;
            relevance_score?: number;
        }[];
    }

    const json = (await resp.json()) as VoyageRerankResult;

    return (json.data ?? []).map(({ index, relevance_score }) => ({
        index,
        score: relevance_score ?? 0,
    }));
}

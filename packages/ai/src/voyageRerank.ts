/**
 * Rerank candidates by relevance to the query.
 * Returns indexes into the original array and their scores (higher = better).
 */
export async function voyageRerank(
    apiKey: string,
    query: string,
    documents: string[]
): Promise<{ index: number; score: number }[]> {
    const model = 'rerank-2.5-lite';
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

    const json: any = await resp.json();
    // json.data = [{ index: number, relevance_score: number, ... }, ...]
    return (json?.data ?? []).map((d: any) => ({
        index: d.index as number,
        score: (d.relevance_score as number) ?? 0,
    }));
}

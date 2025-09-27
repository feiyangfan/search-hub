type VoyageEmbeddingInput = {
    model: string;
    input: string[]; // batch inputs
    input_type?: 'document' | 'query';
    output_dimension: 1024;
    output_dtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary'; // optional
};

export async function voyageEmbed(
    texts: string[],
    {
        model = 'voyage-3.5-lite',
        input_type = 'document',
    }: Partial<Omit<VoyageEmbeddingInput, 'input'>> = {}
): Promise<number[][]> {
    const resp = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            input: texts,
            input_type,
            output_dimension: 1024,
            // output_dtype: "float" // default; you can switch to int8/binary later
        }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Voyage embed failed: ${resp.status} ${errText}`);
    }

    const data = await resp.json();
    const vecs: number[][] = (data.data ?? []).map((d: any) => d.embedding);

    // Sanity check: ensure all vectors match the expected dimension
    for (const v of vecs) {
        if (!Array.isArray(v) || v.length !== 1024) {
            throw new Error(
                `Voyage embedding dimension mismatch. Expected ${1024}, got ${
                    Array.isArray(v) ? v.length : 'unknown'
                }`
            );
        }
    }

    // Voyage returns { data: [{ embedding: number[], index: 0 }, ...], ... }
    return vecs;
}

export const embedQuery = async (text: string, dims = 1024) => {
    const [v] = await voyageEmbed([text], {
        input_type: 'query',
    });
    return v ?? [];
};

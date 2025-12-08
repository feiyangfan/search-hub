export interface VoyageEmbeddingInput {
    model: string;
    input: string[]; // batch inputs
    input_type?: 'document' | 'query';
    output_dimension: 1024;
    output_dtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary'; // optional
}

export async function voyageEmbed(
    apiKey: string,
    texts: string[],
    {
        model = 'voyage-3.5',
        input_type = 'document',
    }: Partial<Omit<VoyageEmbeddingInput, 'input'>> = {}
): Promise<number[][]> {
    const resp = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            input: texts,
            input_type,
            output_dimension: 1024,
            // output_dtype: "float" // default, can switch to int8/binary later
        }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Voyage embed failed: ${resp.status} ${errText}`);
    }

    interface VoyageEmbeddingResponse {
        data?: {
            embedding: number[];
        }[];
    }

    const json = (await resp.json()) as VoyageEmbeddingResponse;
    const vecs: number[][] = (json.data ?? []).map(
        ({ embedding }) => embedding
    );

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

export const embedQuery = async (apiKey: string, text: string) => {
    const [v] = await voyageEmbed(apiKey, [text], {
        input_type: 'query',
    });
    return v ?? [];
};

export function chunkText(input: string, chunkSize = 1000, overlap = 100) {
    const out: { idx: number; text: string }[] = [];
    if (!input) return out;

    const safeChunkSize = Math.max(1, chunkSize);
    const safeOverlap = Math.min(Math.max(0, overlap), safeChunkSize - 1);
    const totalLength = input.length;

    let start = 0;
    let idx = 0;

    while (start < totalLength) {
        const end = Math.min(totalLength, start + safeChunkSize);
        const slice = input.slice(start, end).trim();
        if (slice) out.push({ idx: idx++, text: slice });

        if (end === totalLength) {
            break;
        }

        start = end - safeOverlap;
        if (start <= 0) {
            start = end;
        }
    }

    return out;
}

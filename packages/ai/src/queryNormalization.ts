/**
 * Normalize user queries for semantic search and QA.
 *
 * This improves search quality and cache hit rates by:
 * - Handling Unicode variations (accented characters, composed vs decomposed forms)
 * - Canonicalizing text (lowercase, whitespace normalization)
 * - Removing conversational noise (pleasantries, excessive punctuation)
 * - Applying safety limits (length constraints)
 *
 * @param query - The raw user query string
 * @returns Normalized query string ready for semantic search
 *
 * @example
 * normalizeQuery("Hey, can you please tell me what is AI???")
 * // Returns: "tell me what is ai?"
 *
 * normalizeQuery("café") // composed Unicode
 * normalizeQuery("café") // decomposed Unicode
 * // Both return: "café" (same normalized form)
 */
export function normalizeQuery(query: string): string {
    let normalized = query;

    // 1. Unicode normalization (NFC = Canonical Composition)
    // Ensures "café" (composed) and "café" (decomposed) are treated identically
    normalized = normalized.normalize('NFC');

    // 2. Text canonicalization: lowercase, trim, normalize whitespace
    normalized = normalized.toLowerCase().trim().replace(/\s+/g, ' ');

    // 3. Remove conversational noise that doesn't add semantic value
    // Remove common pleasantries/filler words at the beginning
    normalized = normalized
        .replace(/^(hey|hi|hello|please|can you|could you|would you)\s+/gi, '')
        .replace(/\s+(please|thanks|thank you)[\s.,!?]*$/gi, '');

    // Remove excessive question marks (??? → ?)
    normalized = normalized.replace(/\?{2,}/g, '?');

    // Remove excessive exclamation marks (!!! → !)
    normalized = normalized.replace(/!{2,}/g, '!');

    // Remove other excessive punctuation (... → ., multiple commas, etc.)
    normalized = normalized
        .replace(/\.{2,}/g, '.') // ... → .
        .replace(/,{2,}/g, ',') // ,, → ,
        .replace(/\s+([.,!?])/g, '$1'); // Remove space before punctuation

    // 4. Safety: limit length (very long queries hurt retrieval)
    normalized = normalized.slice(0, 500);

    return normalized;
}

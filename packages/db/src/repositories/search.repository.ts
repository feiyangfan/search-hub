import { prisma } from '../client.js';

export interface SearchCandidate {
    documentId: string;
    idx: number;
    content: string;
    distance: number;
    similarity: number;
    totalChunks?: number; // Total chunks in the document (for context window bounds)
}

export interface DocumentTitleInfo {
    id: string;
    title: string;
}

/**
 * Find nearest document chunks using vector similarity search
 */
async function findNearestChunks(
    tenantId: string,
    embeddingVector: number[],
    limit: number
): Promise<SearchCandidate[]> {
    const candidates = await prisma.$queryRawUnsafe<SearchCandidate[]>(
        `
        SELECT "documentId",
               "idx",
               "content",
               (embedding <=> $1::vector) AS distance,
               1 - (embedding <=> $1::vector) AS similarity
        FROM "DocumentChunk"
        WHERE "tenantId" = $2
        ORDER BY distance ASC
        LIMIT $3
        `,
        `[${embeddingVector.join(',')}]`,
        tenantId,
        limit
    );

    return candidates;
}

/**
 * Fetch document titles by IDs
 */
async function getDocumentTitlesByIds(
    documentIds: string[],
    tenantId: string
): Promise<DocumentTitleInfo[]> {
    const documents = await prisma.document.findMany({
        where: {
            id: { in: documentIds },
            tenantId,
        },
        select: {
            id: true,
            title: true,
        },
    });

    return documents;
}

export interface LexicalSearchResultItem {
    id: string;
    title: string;
    snippet: string | null;
    score: number;
}

export interface LexicalSearchResult {
    items: LexicalSearchResultItem[];
    total: number;
}

/**
 * Perform full-text search on documents with prefix matching support
 */
async function lexicalSearchDocuments(
    tenantId: string,
    searchQuery: string,
    limit: number,
    offset: number
): Promise<LexicalSearchResult> {
    const terms = searchQuery
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (terms.length === 0) {
        return { items: [], total: 0 };
    }

    // Use prefix matching only for longer tokens to reduce noise on very short queries
    const tsQuery = terms
        .map((term) => (term.length > 3 ? `${term}:*` : term))
        .join(' & ');

    const rows = await prisma.$queryRaw<
        (LexicalSearchResultItem & { total: number })[]
    >`
        WITH doc_text AS (
            SELECT 
                d."id",
                d."title",
                COALESCE(
                    (
                        SELECT string_agg(dc."content", ' ' ORDER BY dc."idx")
                        FROM "DocumentChunk" dc
                        WHERE dc."documentId" = d."id"
                    ),
                    d."content",
                    ''
                ) AS body
            FROM "Document" d
            WHERE d."tenantId" = ${tenantId}
        )
        SELECT dt.id,
               dt.title,
               COALESCE(
                   NULLIF(
                       ts_headline(
                           'english',
                           dt.body,
                           to_tsquery('english', ${tsQuery}),
                           'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30,MinWords=1'
                       ),
                       ''
                   ),
                   LEFT(dt.body, 280)
               ) AS snippet,
               ts_rank_cd(d."searchVector", to_tsquery('english', ${tsQuery}), 32) AS score,
               COUNT(*) OVER()::int AS total
        FROM doc_text dt
        JOIN "Document" d ON d."id" = dt.id
        WHERE d."searchVector" @@ to_tsquery('english', ${tsQuery})
        ORDER BY score DESC, d."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset};
    `;

    const total = rows[0]?.total ?? 0;
    const items = rows.map(({ id, title, snippet, score }) => ({
        id,
        title,
        snippet: snippet || null, // Convert empty string to null
        score,
    }));

    return { items, total };
}

export interface DocumentDetailInfo {
    id: string;
    title: string;
    content: string | null;
}

/**
 * Fetch document details by IDs (for semantic-only documents in hybrid search)
 */
async function getDocumentDetailsByIds(
    documentIds: string[],
    tenantId: string
): Promise<DocumentDetailInfo[]> {
    const documents = await prisma.document.findMany({
        where: {
            tenantId,
            id: { in: documentIds },
        },
        select: {
            id: true,
            title: true,
            content: true,
        },
    });

    return documents;
}

export interface AdjacentChunk {
    idx: number;
    content: string;
}

/**
 * Fetch adjacent chunks for contextual retrieval
 * Returns chunks in order (previous, current, next) if they exist
 */
async function getAdjacentChunks(
    documentId: string,
    tenantId: string,
    centerIdx: number,
    contextWindow = 1 // How many chunks before/after to fetch
): Promise<AdjacentChunk[]> {
    const minIdx = Math.max(0, centerIdx - contextWindow);
    const maxIdx = centerIdx + contextWindow;

    const chunks = await prisma.documentChunk.findMany({
        where: {
            documentId,
            tenantId,
            idx: {
                gte: minIdx,
                lte: maxIdx,
            },
        },
        select: {
            idx: true,
            content: true,
        },
        orderBy: {
            idx: 'asc',
        },
    });

    return chunks;
}

export const searchRepository = {
    findNearestChunks,
    getDocumentTitlesByIds,
    lexicalSearchDocuments,
    getDocumentDetailsByIds,
    getAdjacentChunks,
};

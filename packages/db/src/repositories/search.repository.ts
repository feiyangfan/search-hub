import { prisma } from '../client.js';

export interface SearchCandidate {
    documentId: string;
    idx: number;
    content: string;
    distance: number;
    similarity: number;
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
 * Perform full-text search on documents
 */
async function lexicalSearchDocuments(
    tenantId: string,
    searchQuery: string,
    limit: number,
    offset: number
): Promise<LexicalSearchResult> {
    const rows = await prisma.$queryRaw<
        (LexicalSearchResultItem & { total: number })[]
    >`
        SELECT d."id",
            d."title",
            COALESCE(
                NULLIF(
                    ts_headline(
                        'english',
                        COALESCE(d."content", ''),
                        websearch_to_tsquery('english', ${searchQuery}),
                        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30,MinWords=1'
                    ),
                    ''
                ),
                LEFT(d."content", 280)
            ) AS snippet,
            ts_rank(d."searchVector", websearch_to_tsquery('english', ${searchQuery})) AS score,
            COUNT(*) OVER()::int AS total
        FROM "Document" d
        WHERE d."tenantId" = ${tenantId}
        AND d."searchVector" @@ websearch_to_tsquery('english', ${searchQuery})
        ORDER BY score DESC, d."createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
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

export const searchRepository = {
    findNearestChunks,
    getDocumentTitlesByIds,
    lexicalSearchDocuments,
    getDocumentDetailsByIds,
};

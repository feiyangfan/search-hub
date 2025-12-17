import { z } from 'zod';
import { Id } from './common.js';

export const QaSource = z.object({
    id: Id,
    title: z.string(),
    snippet: z.string(),
    score: z.number(),
});

export type QaSource = z.infer<typeof QaSource>;

export const QaRequest = z.object({
    question: z.string().min(1).meta({
        description: 'User question to answer with workspace context',
        example: 'When should I use binary search?',
    }),
    k: z.coerce.number().int().min(1).max(50).default(5).meta({
        description: 'Top reranked results to keep',
        example: 5,
    }),
    recall_k: z.coerce.number().int().min(1).max(50).default(15).meta({
        description: 'Candidates to retrieve before rerank',
        example: 15,
    }),
    maxSources: z.coerce.number().int().min(1).max(20).default(5).meta({
        description: 'Maximum sources to send to the LLM',
        example: 5,
    }),
});

export type QaRequest = z.infer<typeof QaRequest>;
export type QaRequestWithTenant = QaRequest & { tenantId: string };

export const QaResponse = z.object({
    answer: z.string(),
    sources: z.array(QaSource),
    noContext: z.boolean().optional(),
});

export type QaResponse = z.infer<typeof QaResponse>;

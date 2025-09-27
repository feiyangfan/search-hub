import { z } from 'zod';

export const SemanticQuery = z.object({
    tenantId: z.string().min(1),
    q: z.string().min(1),
    k: z.coerce.number().int().min(1).max(50).default(10),
    recall_k: z.coerce.number().int().min(1).max(50).default(5),
});
export type SemanticQuery = z.infer<typeof SemanticQuery>;

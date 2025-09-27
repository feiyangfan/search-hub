// apps/api/src/routes.ts
// routes -> validate -> do work -> respond
import { Router } from 'express';
import { type z } from 'zod';
import {
    validateBody,
    validateQuery,
} from '../middleware/validateMiddleware.js';
import {
    CreateDocumentRequest,
    CreateDocumentResponse,
    IndexDocumentJobSchema,
    SearchQuery,
    SearchResponse,
    SemanticQuery,
} from '@search-hub/schemas';
import { prisma, db } from '@search-hub/db';
import { indexQueue } from '../queue.js';
import { JOBS, IndexDocumentJob } from '@search-hub/schemas';
import { embedQuery } from '@search-hub/ai';
import { voyageRerank } from '@search-hub/ai';

import { logger } from '@search-hub/logger';

export function buildRoutes() {
    const r = Router();

    // POST /v1/documents → queue indexing
    r.post(
        '/v1/documents',
        validateBody(CreateDocumentRequest),
        async (req, res, next) => {
            try {
                const body = (req as any).validated.body as z.infer<
                    typeof CreateDocumentRequest
                >;

                // We write the DB row before enqueue.
                // If enqueue fails, the DB shows queued with no Redis job;
                // The runbook has a remediation (re-enqueue).
                // The inverse order is also valid (enqueue then DB),
                // but then a crash between the two creates a “ghost” Redis job with no DB record.
                logger.info('document.create.start');
                const doc = await db.document.create({
                    tenantId: body.tenantId,
                    title: body.title,
                    source: body.source,
                    mimeType: body.mimeType,
                    content: body.content,
                });

                logger.info(
                    {
                        docomuentId: doc.id,
                    },
                    'document.create.succeeded'
                );

                await db.job.enqueueIndex(body.tenantId, doc.id);

                // Enqueue work to index the document
                // Could do this here in a transaction with the document creation
                const jobPayload: IndexDocumentJob =
                    IndexDocumentJobSchema.parse({
                        tenantId: doc.tenantId,
                        documentId: doc.id,
                    });

                const job = await indexQueue.add(
                    JOBS.INDEX_DOCUMENT,
                    jobPayload,
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                        removeOnComplete: true,
                        removeOnFail: false, // For debugging keep failed jobs in the queue
                    }
                );

                logger.info(
                    {
                        docId: doc.id,
                        jobId: job.id,
                        tenantId: doc.tenantId,
                    },
                    'queue.enqueue.succeeded'
                );

                // Respond with 'queued',
                res.status(202).json({ id: doc.id, status: 'queued' }); // 202 accepted since it's async work (queue)
            } catch (err) {
                next(err);
            }
        }
    );

    // POST /v1/tenants to create new tenant
    r.post('/v1/tenants', async (req, res, next) => {
        try {
            const name = (req.body?.name as string | undefined)?.trim();
            if (!name)
                return res.status(400).json({ error: 'name is required' });

            // Prevent dup by name (will use unique slug in Prisma)
            const existing = await prisma.tenant.findFirst({ where: { name } });
            if (existing) return res.status(200).json(existing);

            const tenant = await prisma.tenant.create({ data: { name } });
            res.status(201).json(tenant);
        } catch (err) {
            next(err);
        }
    });

    // GET /v1/search?q=&tenantId=...
    r.get('/v1/search', validateQuery(SearchQuery), async (req, res, next) => {
        try {
            const q = (req as any).validated.query as z.infer<
                typeof SearchQuery
            >;

            const where = {
                tenantId: q.tenantId,
                title: { contains: q.q, mode: 'insensitive' as const },
            };

            const [items, total] = await Promise.all([
                prisma.document.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: q.limit,
                    skip: q.offset,
                }),
                prisma.document.count({ where }),
            ]);

            const resp: z.infer<typeof SearchResponse> = {
                total: total,
                items: items.map((item: (typeof items)[number]) => ({
                    id: item.id,
                    title: item.title,
                })),
                page: Math.floor(q.offset / q.limit) + 1,
                pageSize: q.limit,
            };

            res.json(resp);
        } catch (err) {
            next(err);
        }
    });

    // GET /v1/semantic-search?q=&tenantId=...
    r.get('/v1/semantic-search', async (req, res, next) => {
        try {
            const { tenantId, q, k, recall_k } = SemanticQuery.parse(req.query);

            // Query embedding
            const qVec = await embedQuery(String(q));

            // Vector Search with cosine
            type Candidate = {
                documentId: string;
                idx: number;
                content: string;
                distance: number;
                similarity: number;
            };
            const candidates = await prisma.$queryRawUnsafe<Candidate[]>(
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
                `[${qVec.join(',')}]`,
                tenantId,
                recall_k
            );

            if (candidates.length === 0) return res.json({ items: [] });

            // 3) Rerank those candidates (higher score = better)
            const rerank = await voyageRerank(
                String(q),
                candidates.map((candidate: Candidate) => candidate.content)
            );

            const byRerank = rerank
                .sort((a, b) => b.score - a.score)
                .slice(0, k)
                .map(({ index, score }) => ({
                    ...candidates[index],
                    rerankScore: score, // Voyage's relevance score
                }));

            res.json({ items: byRerank });
        } catch (error: any) {
            if (error?.name === 'ZodError') {
                return res
                    .status(400)
                    .json({ error: 'Invalid query', details: error.issues });
            }
            next(error);
        }
    });

    return r;
}

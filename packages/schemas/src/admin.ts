import { z } from 'zod';

/**
 * Admin API schemas for monitoring and management
 */

// ===== Indexing Status =====

export const JobStatusSchema = z.enum([
    'queued',
    'processing',
    'indexed',
    'failed',
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const IndexingStatsSchema = z.object({
    totalDocuments: z.number().int().nonnegative(),
    indexed: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    processing: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    emptyContent: z.number().int().nonnegative(),
    totalChunks: z.number().int().nonnegative(),
});
export type IndexingStats = z.infer<typeof IndexingStatsSchema>;

export const WorkerStatusSchema = z.object({
    isHealthy: z.boolean(),
    queueDepth: z.number().int().nonnegative(),
    activeJobs: z.number().int().nonnegative(),
    maxConcurrency: z.number().int().positive(),
    lastProcessedAt: z.string().datetime().nullable(),
});
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

export const JobHistorySchema = z.object({
    id: z.string(),
    status: JobStatusSchema,
    error: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    durationSeconds: z.number().nonnegative().optional(),
});
export type JobHistory = z.infer<typeof JobHistorySchema>;

export const DocumentIndexingDetailSchema = z.object({
    id: z.string(),
    title: z.string(),
    tenantId: z.string(),
    contentLength: z.number().int().nonnegative(),
    chunkCount: z.number().int().nonnegative(),
    status: JobStatusSchema.or(z.literal('none')),
    lastError: z.string().nullable(),
    lastIndexedAt: z.string().datetime().nullable(),
    lastJobUpdatedAt: z.string().datetime().nullable(),
    checksum: z.string().nullable(),
    recentJobs: z.array(JobHistorySchema).max(5),
});
export type DocumentIndexingDetail = z.infer<
    typeof DocumentIndexingDetailSchema
>;

export const ProblemDocumentsSchema = z.object({
    failed: z.array(DocumentIndexingDetailSchema),
    stuckInQueue: z.array(DocumentIndexingDetailSchema),
    emptyContent: z.array(DocumentIndexingDetailSchema),
});
export type ProblemDocuments = z.infer<typeof ProblemDocumentsSchema>;

export const IndexingStatusResponseSchema = z.object({
    stats: IndexingStatsSchema,
    worker: WorkerStatusSchema,
    problems: ProblemDocumentsSchema,
    recentlyIndexed: z.array(DocumentIndexingDetailSchema).max(10).optional(),
});
export type IndexingStatusResponse = z.infer<
    typeof IndexingStatusResponseSchema
>;

// Query params for indexing endpoint
export const IndexingStatusQuerySchema = z.object({
    includeRecent: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
});
export type IndexingStatusQuery = z.infer<typeof IndexingStatusQuerySchema>;

// ===== Token Usage =====

export const ModelUsageSchema = z.object({
    embedTokens: z.number().int().nonnegative(),
    rerankTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
});
export type ModelUsage = z.infer<typeof ModelUsageSchema>;

export const UsageSummarySchema = z.object({
    totalTokens: z.number().int().nonnegative(),
    freeTierLimit: z.number().int().positive(),
    remainingTokens: z.number().int().nonnegative(),
    percentUsed: z.number().nonnegative().max(100),
    status: z.enum(['healthy', 'caution', 'warning', 'exceeded']),
});
export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const TokenUsageResponseSchema = z.object({
    byModel: z.record(z.string(), ModelUsageSchema),
    summary: UsageSummarySchema,
});
export type TokenUsageResponse = z.infer<typeof TokenUsageResponseSchema>;

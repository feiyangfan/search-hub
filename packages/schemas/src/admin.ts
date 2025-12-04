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
    lastProcessedAt: z.iso.datetime().nullable(),
});
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;

export const JobHistorySchema = z.object({
    id: z.string(),
    status: JobStatusSchema,
    error: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    startedAt: z.iso.datetime().nullable().optional(),
    completedAt: z.iso.datetime().nullable().optional(),
    durationSeconds: z.number().nonnegative().optional(),
    isStuck: z.boolean().optional(),
    documentId: z.string().optional(),
    documentTitle: z.string().optional(),
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
    lastIndexedAt: z.iso.datetime().nullable(),
    lastJobUpdatedAt: z.iso.datetime().nullable(),
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
    recentJobs: z.array(JobHistorySchema).optional(),
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
    includeRecentJobs: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
    jobLimit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined)),
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

// ===== Queue Status =====

export const QueueJobSchema = z.object({
    id: z.string().nullable(),
    name: z.string(),
    data: z.record(z.string(), z.unknown()),
    timestamp: z.number(),
    processedOn: z.number().nullable().optional(),
    attemptsMade: z.number().int().nonnegative(),
    failedReason: z.string().nullable().optional(),
});
export type QueueJob = z.infer<typeof QueueJobSchema>;

export const QueueCountsSchema = z.object({
    waiting: z.number().int().nonnegative().optional(),
    active: z.number().int().nonnegative().optional(),
    delayed: z.number().int().nonnegative().optional(),
    failed: z.number().int().nonnegative().optional(),
    completed: z.number().int().nonnegative().optional(),
    paused: z.number().int().nonnegative().optional(),
});
export type QueueCounts = z.infer<typeof QueueCountsSchema>;

export const RecentlyIndexedDocumentSchema = z.object({
    documentId: z.string(),
    title: z.string(),
    tenantId: z.string(),
    lastIndexedAt: z.iso.datetime(),
    lastChecksum: z.string().nullable(),
    documentUpdatedAt: z.iso.datetime(),
});
export type RecentlyIndexedDocument = z.infer<
    typeof RecentlyIndexedDocumentSchema
>;

export const QueueStatusResponseSchema = z.object({
    queueName: z.string(),
    counts: QueueCountsSchema,
    waiting: z.array(QueueJobSchema),
    active: z.array(QueueJobSchema),
    failed: z.array(QueueJobSchema),
    recentlyIndexed: z.array(RecentlyIndexedDocumentSchema).optional(),
});
export type QueueStatusResponse = z.infer<typeof QueueStatusResponseSchema>;

export const QueueStatusQuerySchema = z.object({
    limit: z.string().optional(),
    includeRecent: z
        .string()
        .optional()
        .transform((val) => val === 'true'),
});
export type QueueStatusQuery = z.infer<typeof QueueStatusQuerySchema>;

import { Worker, Queue, QueueEvents } from 'bullmq';
import { logger as baseLogger } from './logger.js';
import { loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';
import {
    JOBS,
    type IndexDocumentJob,
    type SendReminderJob,
    type SyncStaleDocumentsJob,
} from '@search-hub/schemas';
import { processIndexDocument } from './jobs/processIndexDocument.js';
import { processSendReminder } from './jobs/processSendReminder.js';
import { syncStaleDocuments } from './jobs/syncStaleDocuments.js';
import { cleanupOldJobs } from './jobs/cleanupOldJobs.js';

const env = loadWorkerEnv();

const logger = baseLogger.child({
    component: 'worker-lifecycle',
});

const REDIS_URL = env.REDIS_URL ?? 'redis://localhost:6379';
const WORKER_CONCURRENCY = Number(env.WORKER_CONCURRENCY ?? 5);
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

logger.info(
    {
        concurrency: WORKER_CONCURRENCY,
        redisUrl: REDIS_URL,
        syncIntervalMs: SYNC_INTERVAL_MS,
        cleanupIntervalMs: CLEANUP_INTERVAL_MS,
    },
    'worker.bootstrap.started'
);

const connection = { url: REDIS_URL };

// ===== INDEX DOCUMENT WORKER =====

// Queue instance for adding jobs (used by scheduled tasks)
export const indexQueue = new Queue<IndexDocumentJob>(JOBS.INDEX_DOCUMENT, {
    connection,
});

// Create worker with extracted processor
const indexWorker = new Worker<IndexDocumentJob>(
    JOBS.INDEX_DOCUMENT,
    processIndexDocument,
    {
        connection,
        concurrency: WORKER_CONCURRENCY,
    }
);

indexWorker.on('ready', () =>
    logger.info(
        { worker: 'index-document', concurrency: WORKER_CONCURRENCY },
        'worker.ready'
    )
);
indexWorker.on('error', (err) =>
    logger.error({ err, worker: 'index-document' }, 'worker.error')
);

// Listen to queue-level events for observability
const indexQueueEvents = new QueueEvents(JOBS.INDEX_DOCUMENT, { connection });

indexQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId, jobType: 'index_document' }, 'job.completed');

    // Decrease queue depth (job finished processing)
    metrics.queueDepth.dec({
        queue_name: JOBS.INDEX_DOCUMENT,
        tenant_id: 'all',
    });

    // Track successful job completion
    metrics.jobsProcessed.inc({
        job_type: 'index_document',
        result: 'success',
    });
});

indexQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(
        { jobId, jobType: 'index_document', failedReason },
        'job.failed'
    );

    // Decrease queue depth (job finished, even though it failed)
    metrics.queueDepth.dec({
        queue_name: JOBS.INDEX_DOCUMENT,
        tenant_id: 'all',
    });

    // Track failed job
    metrics.jobsProcessed.inc({
        job_type: 'index_document',
        result: 'failure',
    });
    metrics.jobsFailed.inc({
        job_type: 'index_document',
        error_code: 'processing_error',
    });
});

// ===== SEND REMINDER WORKER =====

const reminderWorker = new Worker<SendReminderJob>(
    JOBS.SEND_REMINDER,
    processSendReminder,
    {
        connection,
        concurrency: 5, // Process up to 5 reminders concurrently
    }
);

reminderWorker.on('ready', () =>
    logger.info({ worker: 'send-reminder', concurrency: 5 }, 'worker.ready')
);
reminderWorker.on('error', (err) =>
    logger.error({ err, worker: 'send-reminder' }, 'worker.error')
);

const reminderQueueEvents = new QueueEvents(JOBS.SEND_REMINDER, {
    connection,
});

reminderQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId, jobType: 'send_reminder' }, 'job.completed');
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'success',
    });
});

reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(
        { jobId, jobType: 'send_reminder', failedReason },
        'job.failed'
    );
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'failure',
    });
});

// ===== SYNC STALE DOCUMENTS WORKER =====

// Queue instance for sync stale documents jobs
const syncStaleQueue = new Queue<SyncStaleDocumentsJob>(
    JOBS.SYNC_STALE_DOCUMENTS,
    { connection }
);

// Create worker - passes indexQueue to processor for queueing stale docs
const syncStaleWorker = new Worker<SyncStaleDocumentsJob>(
    JOBS.SYNC_STALE_DOCUMENTS,
    async (job) => syncStaleDocuments(job, indexQueue),
    {
        connection,
        concurrency: 1, // Only one sync job should run at a time
    }
);

syncStaleWorker.on('ready', () =>
    logger.info(
        { worker: 'sync-stale-documents', concurrency: 1 },
        'worker.ready'
    )
);
syncStaleWorker.on('error', (err) =>
    logger.error({ err, worker: 'sync-stale-documents' }, 'worker.error')
);

const syncStaleQueueEvents = new QueueEvents(JOBS.SYNC_STALE_DOCUMENTS, {
    connection,
});

syncStaleQueueEvents.on('completed', ({ jobId, returnvalue }) => {
    const result = returnvalue as unknown as { queued: number; errors: number };
    logger.info(
        {
            jobId,
            jobType: 'sync_stale_documents',
            queued: result.queued,
            errors: result.errors,
        },
        'job.completed'
    );
    metrics.jobsProcessed.inc({
        job_type: 'sync_stale_documents',
        result: 'success',
    });
});

syncStaleQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(
        { jobId, jobType: 'sync_stale_documents', failedReason },
        'job.failed'
    );
    metrics.jobsProcessed.inc({
        job_type: 'sync_stale_documents',
        result: 'failure',
    });
});

// Schedule sync stale documents job with BullMQ repeat pattern
await syncStaleQueue.add(
    JOBS.SYNC_STALE_DOCUMENTS,
    {},
    {
        repeat: {
            pattern: '*/30 * * * *', // Every 30 minutes (cron format)
        },
        jobId: 'sync-stale-documents-repeating', // Ensures only one repeating job exists
    }
);

logger.info(
    { pattern: '*/30 * * * *', jobId: 'sync-stale-documents-repeating' },
    'schedule.sync_stale.configured'
);

// ===== SCHEDULED JOB: CLEANUP OLD INDEXED JOBS =====

async function runCleanupOldJobs() {
    try {
        logger.info('schedule.cleanup.started');
        const result = await cleanupOldJobs();
        logger.info(
            {
                deleted: result.deleted,
            },
            'schedule.cleanup.completed'
        );
    } catch (error) {
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
            },
            'schedule.cleanup.failed'
        );
    }
}

// Run immediately on startup, then every 24 hours
void runCleanupOldJobs();
setInterval(() => {
    void runCleanupOldJobs();
}, CLEANUP_INTERVAL_MS);

// ===== BOOTSTRAP COMPLETE =====

logger.info(
    {
        workers: ['index-document', 'send-reminder', 'sync-stale-documents'],
        scheduledJobs: ['cleanup-old-jobs'],
    },
    'worker.bootstrap.completed'
);

// ===== GRACEFUL SHUTDOWN =====

const handleSigint = async () => {
    logger.info('worker.shutdown.initiated');

    try {
        logger.info('worker.shutdown.closing_workers');
        await indexWorker.close();
        await reminderWorker.close();
        await syncStaleWorker.close();
        await indexQueueEvents.close();
        await reminderQueueEvents.close();
        await syncStaleQueueEvents.close();

        logger.info('worker.shutdown.completed');
        process.exit(0);
    } catch (error) {
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
            },
            'worker.shutdown.failed'
        );
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    void handleSigint();
});

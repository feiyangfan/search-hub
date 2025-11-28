import { Worker, Queue, QueueEvents } from 'bullmq';
import { logger as base } from '@search-hub/logger';
import { loadWorkerEnv } from '@search-hub/config-env';
import { metrics } from '@search-hub/observability';
import {
    JOBS,
    type IndexDocumentJob,
    type SendReminderJob,
} from '@search-hub/schemas';
import { processIndexDocument } from './jobs/processIndexDocument.js';
import { processSendReminder } from './jobs/processSendReminder.js';
import { syncStaleDocuments } from './jobs/syncStaleDocuments.js';

const env = loadWorkerEnv();

const logger = base.child({
    service: 'worker',
});

const REDIS_URL = env.REDIS_URL ?? 'redis://localhost:6379';
const WORKER_CONCURRENCY = Number(env.WORKER_CONCURRENCY ?? 5);
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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

indexWorker.on('ready', () => logger.info('Index worker started'));
indexWorker.on('error', (err) =>
    logger.error({ err }, 'Index worker fatal error')
);
indexWorker.on('failed', (job, err) =>
    logger.debug(
        { jobId: job?.id, err },
        'Index job failed (will retry if attempts remain)'
    )
);

// Listen to queue-level events for observability
const indexQueueEvents = new QueueEvents(JOBS.INDEX_DOCUMENT, { connection });

indexQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Index job completed');

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
    logger.error({ jobId, failedReason }, 'Index job failed');

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

reminderWorker.on('ready', () => logger.info('Reminder worker started'));
reminderWorker.on('error', (err) =>
    logger.error({ err }, 'Reminder worker fatal error')
);

const reminderQueueEvents = new QueueEvents(JOBS.SEND_REMINDER, {
    connection,
});

reminderQueueEvents.on('completed', ({ jobId }) => {
    logger.info({ jobId }, 'Reminder job completed');
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'success',
    });
});

reminderQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Reminder job failed');
    metrics.jobsProcessed.inc({
        job_type: 'send_reminder',
        result: 'failure',
    });
});

// ===== SCHEDULED JOB: SYNC STALE DOCUMENTS =====

async function runSyncStaleDocuments() {
    try {
        logger.info('scheduled_sync.starting');
        const result = await syncStaleDocuments(indexQueue);
        logger.info(
            {
                queued: result.queued,
                errors: result.errors,
            },
            'scheduled_sync.completed'
        );
    } catch (error) {
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
            },
            'scheduled_sync.error'
        );
    }
}

// Run immediately on startup, then every 30 minutes
void runSyncStaleDocuments();
const syncInterval = setInterval(() => {
    void runSyncStaleDocuments();
}, SYNC_INTERVAL_MS);

// ===== GRACEFUL SHUTDOWN =====

const handleSigint = async () => {
    logger.info('Shutting down workers...');
    clearInterval(syncInterval);
    await indexWorker.close();
    await reminderWorker.close();
    await indexQueueEvents.close();
    await reminderQueueEvents.close();
    process.exit(0);
};

process.on('SIGINT', () => {
    void handleSigint();
});

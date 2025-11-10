import { Queue } from 'bullmq';
import { JOBS, IndexDocumentJob, SendReminderJob } from '@search-hub/schemas';
import { env } from './config/env.js';

const REDIS_URL = env.REDIS_URL ?? 'redis://localhost:6379';

// Prevent duplicate queue instances during dev reloads.
declare global {
    var __queues:
        | {
              indexDocument?: Queue<IndexDocumentJob>;
              reminder?: Queue<SendReminderJob>;
          }
        | undefined;
}

const connection = { url: REDIS_URL };

function createIndexQueue() {
    return new Queue<IndexDocumentJob>(JOBS.INDEX_DOCUMENT, { connection });
}

function createReminderQueue() {
    return new Queue<SendReminderJob>(JOBS.SEND_REMINDER, { connection });
}

export const indexQueue =
    globalThis.__queues?.indexDocument ?? createIndexQueue();

export const reminderQueue =
    globalThis.__queues?.reminder ?? createReminderQueue();

globalThis.__queues = {
    ...(globalThis.__queues ?? {}),
    indexDocument: indexQueue,
    reminder: reminderQueue,
};

// apps/api/src/queue.ts
import { Queue } from 'bullmq';
import { JOBS, IndexDocumentJob } from '@search-hub/schemas';
import { loadWorkerEnv } from '@search-hub/config-env';

const env = loadWorkerEnv();

const REDIS_URL = env.REDIS_URL ?? 'redis://localhost:6379';

// Prevent duplicate queue instances during dev reloads.
declare global {
    // eslint-disable-next-line no-var
    var __queues: { indexDocument?: Queue<IndexDocumentJob> } | undefined;
}

const connection = { url: REDIS_URL };

function createIndexQueue() {
    return new Queue<IndexDocumentJob>(JOBS.INDEX_DOCUMENT, { connection });
}

export const indexQueue =
    globalThis.__queues?.indexDocument ?? createIndexQueue();

globalThis.__queues = {
    ...(globalThis.__queues ?? {}),
    indexDocument: indexQueue,
};

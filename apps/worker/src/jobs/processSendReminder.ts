/**
 * Job processor for sending reminder notifications
 * Updates DocumentCommand status from 'scheduled' to 'notified'
 */

import type { Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '../logger.js';
import { SendReminderJobSchema } from '@search-hub/schemas';
import type { SendReminderJob } from '@search-hub/schemas';

export type ReminderProcessorResult =
    | { ok: true; reason: 'not-found' | 'already-processed' }
    | { ok: true; documentCommandId: string };

/**
 * Process a send reminder job
 * - Fetches the DocumentCommand
 * - Checks if still scheduled
 * - Updates status to 'notified'
 */
export async function processSendReminder(
    job: Job<SendReminderJob>
): Promise<ReminderProcessorResult> {
    const { tenantId, documentCommandId } = SendReminderJobSchema.parse(
        job.data
    );

    // Create job-scoped logger with context
    const logger = baseLogger.child({
        component: 'send-reminder-job',
        jobId: job.id,
        tenantId,
        documentCommandId,
        attempt: job.attemptsMade + 1,
    });

    try {
        // Fetch the reminder command with related document info
        const command = await db.documentCommand.getByIdWithDocument(
            documentCommandId
        );

        if (!command) {
            logger.warn('job.skipped.command_not_found');
            return { ok: true, reason: 'not-found' };
        }

        const body = command.body as Record<string, unknown>;
        const currentStatus = body?.status as string | undefined;

        // Only notify if still scheduled (not already done/snoozed)
        if (currentStatus !== 'scheduled') {
            logger.info(
                { status: currentStatus },
                'job.skipped.already_processed'
            );
            return { ok: true, reason: 'already-processed' };
        }

        // Update status to 'notified'
        // For JSONB columns, we need to pass the complete updated object
        const updatedBody = {
            ...body,
            status: 'notified',
            notifiedAt: new Date().toISOString(),
        };

        await db.documentCommand.updateBody(documentCommandId, updatedBody);

        logger.info(
            {
                userId: command.userId,
                documentId: command.documentId,
                documentTitle: command.document?.title,
                whenText: body?.whenText,
            },
            'job.completed'
        );

        return { ok: true, documentCommandId };
    } catch (error) {
        logger.error(
            {
                error: error instanceof Error ? error.message : String(error),
            },
            'job.failed'
        );
        throw error;
    }
}

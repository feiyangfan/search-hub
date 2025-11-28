/**
 * Job processor for sending reminder notifications
 * Updates DocumentCommand status from 'scheduled' to 'notified'
 */

import type { Job } from 'bullmq';
import { db } from '@search-hub/db';
import { logger as baseLogger } from '@search-hub/logger';
import { SendReminderJobSchema } from '@search-hub/schemas';
import type { SendReminderJob } from '@search-hub/schemas';

const logger = baseLogger.child({
    service: 'worker',
    processor: 'send-reminder',
});

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

    logger.info(
        { documentCommandId, tenantId, jobId: job.id },
        'processor.started'
    );

    try {
        // Fetch the reminder command with related document info
        const command = await db.documentCommand.getByIdWithDocument(
            documentCommandId
        );

        if (!command) {
            logger.warn(
                { documentCommandId },
                'DocumentCommand not found, may have been deleted'
            );
            return { ok: true, reason: 'not-found' };
        }

        const body = command.body as Record<string, unknown>;
        const currentStatus = body?.status as string | undefined;

        // Only notify if still scheduled (not already done/snoozed)
        if (currentStatus !== 'scheduled') {
            logger.info(
                { documentCommandId, status: currentStatus },
                'Reminder already processed or cancelled'
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
                documentCommandId,
                userId: command.userId,
                documentId: command.documentId,
                documentTitle: command.document?.title,
                whenText: body?.whenText,
            },
            'processor.success'
        );

        return { ok: true, documentCommandId };
    } catch (error) {
        logger.error(
            { error, documentCommandId, tenantId, jobId: job.id },
            'processor.failed'
        );
        throw error;
    }
}

import * as chrono from 'chrono-node';
import { type RemindCommandPayloadType, JOBS } from '@search-hub/schemas';
import { prisma } from '@search-hub/db';
import { reminderQueue } from '../queue.js';

/**
 * Regular expression to match reminder shortcodes in markdown:
 * %%remind: tomorrow | status=scheduled%%
 * %%remind: next week at 2pm%%
 * %%remind: This line @ Tomorrow | iso=2025-11-11T16:23:00.079Z,id=r_mhtcpgic_cmmxqv%%
 *
 * Pattern explanation:
 * - %% - Opening percent signs
 * - \s*remind\s*:\s* - "remind" keyword with optional whitespace and colon
 * - ([^|%]+?) - Capture group 1: whenText (non-greedy, stops at | or %)
 * - (?:\s*\|\s*([^%]+))? - Optional capture group 2: attributes after |
 * - \s*%% - Closing percent signs with optional whitespace
 */

/**
 * Parses attributes from the optional second part of remind shortcode
 * Example: "status=scheduled, iso=2025-11-11T10:00:00Z"
 */
function parseRemindAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (!attrString) return attrs;

    for (const pair of attrString.split(',').map((s) => s.trim())) {
        const [key, value] = pair.split('=').map((s) => s.trim());
        if (key && value) {
            attrs[key.toLowerCase()] = value;
        }
    }
    return attrs;
}

/**
 * Extracts all remind commands from markdown content
 * Parses natural language dates using chrono-node
 */
export function extractRemindCommands(
    content: string
): RemindCommandPayloadType[] {
    const reminders: RemindCommandPayloadType[] = [];
    // Match %%remind: ...%% format (no escaping issues with %%)
    const regex = /%%\s*remind\s*:\s*([^|%]+?)(?:\|([^%]+))?\s*%%/gi;
    let match: RegExpExecArray | null;
    console.log('[extractRemindCommands] Content:', content);
    console.log('[extractRemindCommands] Testing regex match');

    while ((match = regex.exec(content)) !== null) {
        console.log('[extractRemindCommands] Match found:', match[0]);
        const whenText = (match[1] || '').trim();
        const attrString = (match[2] || '').trim();
        // No need to unescape with %% format
        const attrs = parseRemindAttributes(attrString);
        console.log('[extractRemindCommands] whenText:', whenText);
        console.log('[extractRemindCommands] attrString:', attrString);

        // Parse natural language date using chrono-node
        let whenISO: string | null = null;
        if (whenText) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            const results = chrono.parse(whenText);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const parsed = results?.[0];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (parsed?.start) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                whenISO = parsed.start.date().toISOString();
            }
        }

        // Override with explicit ISO if provided in attributes
        if (attrs.iso) {
            whenISO = attrs.iso;
        }

        const status =
            (attrs.status as 'scheduled' | 'overdue' | 'done') || 'scheduled';

        reminders.push({
            kind: 'remind',
            whenText: whenText || '',
            whenISO: whenISO,
            status,
        });
    }
    console.log('Extracted reminders:', reminders);
    return reminders;
}

/**
 * Syncs reminders from document content to DocumentCommand table
 * Creates new, updates existing, and removes stale remind commands
 * Schedules BullMQ jobs for future notifications
 */
export async function syncReminders({
    documentId,
    userId,
    tenantId,
    reminders,
}: {
    documentId: string;
    userId: string;
    tenantId: string;
    reminders: RemindCommandPayloadType[];
}): Promise<void> {
    // Delete all existing remind commands for this document
    await prisma.documentCommand.deleteMany({
        where: {
            documentId,
            body: {
                path: ['kind'],
                equals: 'remind',
            },
        },
    });

    // Create new remind commands and schedule notification jobs
    for (const reminder of reminders) {
        // Only schedule if status is 'scheduled' and has future date
        const shouldSchedule =
            reminder.status === 'scheduled' &&
            reminder.whenISO &&
            new Date(reminder.whenISO).getTime() > Date.now();

        const command = await prisma.documentCommand.create({
            data: {
                documentId,
                userId,
                body: reminder,
            },
        });

        // Schedule BullMQ job for notification
        if (shouldSchedule && reminder.whenISO) {
            const delay = new Date(reminder.whenISO).getTime() - Date.now();
            await reminderQueue.add(
                JOBS.SEND_REMINDER,
                {
                    tenantId,
                    documentCommandId: command.id,
                },
                {
                    delay,
                    jobId: `reminder-${command.id}`, // Unique job ID to prevent duplicates
                }
            );
        }
    }
}

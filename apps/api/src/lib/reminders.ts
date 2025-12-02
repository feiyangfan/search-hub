import * as chrono from 'chrono-node';
import { type RemindCommandPayloadType } from '@search-hub/schemas';

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
            // Unescape markdown-escaped underscores in values (e.g., r\_abc -> r_abc)
            const unescapedValue = value.replace(/\\_/g, '_');
            attrs[key.toLowerCase()] = unescapedValue;
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

    while ((match = regex.exec(content)) !== null) {
        const whenText = (match[1] || '').trim();
        const attrString = (match[2] || '').trim();
        // No need to unescape with %% format
        const attrs = parseRemindAttributes(attrString);

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
            id: attrs.id, // Extract ID from markdown attributes
        });
    }
    return reminders;
}

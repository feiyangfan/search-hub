// remindNode.ts
import type { NodeSpec } from 'prosemirror-model';

export type RemindStatus = 'scheduled' | 'overdue' | 'done';

export const remindSpec: NodeSpec = {
    inline: true,
    group: 'inline',
    content: 'text*',
    selectable: false,
    atom: false,
    attrs: {
        kind: { default: 'remind' },
        whenText: { default: '' }, // raw user input, e.g. "in 3 days"
        whenISO: { default: null }, // ISO string or null
        status: { default: 'scheduled' as RemindStatus },
        id: { default: null },
    },
    parseDOM: [
        {
            tag: 'span[data-remind]',
        },
    ],
    toDOM: (node) => {
        const status = node.attrs.status as RemindStatus;
        return [
            'span',
            {
                'data-remind': '',
                'data-status': status,
                class: `pm-remind pm-remind-${status}`,
            },
            0,
        ];
    },
};

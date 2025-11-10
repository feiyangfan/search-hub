import { $nodeSchema, $view, $inputRule, $prose } from '@milkdown/utils';
import type { Ctx } from '@milkdown/ctx';
import type { Node as PMNode } from 'prosemirror-model';
import { InputRule } from '@milkdown/prose/inputrules';
import {
    Plugin,
    PluginKey,
    TextSelection,
    Selection,
} from '@milkdown/prose/state';
import { RemindView } from './remindView';
import type { EditorView } from 'prosemirror-view';
import * as chrono from 'chrono-node';
import { remindSpec, type RemindStatus } from './remindNode';

// shared regex for bracket parsing
const REMIND_SHORTCODE_PATTERN =
    '%%\\s*remind\\s*:\\s*([^|%]+?)(?:\\|([^%]+))?\\s*%%';
export const createRemindShortcodeRegex = () =>
    new RegExp(REMIND_SHORTCODE_PATTERN, 'gi');
const BRACKET_RE = createRemindShortcodeRegex();

type RemindAttrs = {
    kind: 'remind';
    whenText: string;
    whenISO?: string | null;
    status?: RemindStatus;
    id?: string | null;
};

export function parseRemindShortcodeMatch(match: RegExpExecArray): {
    whenText: string;
    attrs: Record<string, unknown>;
} {
    const whenText = (match[1] || '').trim();
    const rest = (match[2] || '').trim();
    const attrs: Record<string, unknown> = { kind: 'remind', whenText };
    if (rest) {
        for (const pair of rest
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)) {
            const [k, v] = pair.split('=').map((s) => s.trim());
            if (!k || !v) continue;
            if (k.toLowerCase() === 'iso') attrs['whenISO'] = v;
            else if (k.toLowerCase() === 'status') attrs['status'] = v;
            else if (k.toLowerCase() === 'id') attrs['id'] = v;
            else attrs[k] = v;
        }
    }
    return { whenText, attrs };
}

// --- Node schema with markdown IO
type ParseState = {
    addText: (text: string) => void;
    openNode: (type: unknown, attrs?: Record<string, unknown>) => void;
    closeNode: () => void;
};

type ToMarkdownState = {
    addNode: (
        name: string,
        arg1?: unknown,
        arg2?: unknown,
        data?: unknown
    ) => void;
};

export const remindNodeSchema = $nodeSchema('remind', (_ctx) => ({
    ...remindSpec,
    parseMarkdown: {
        match: ({ type, value }: { type: string; value?: unknown }) =>
            type === 'text' &&
            typeof value === 'string' &&
            /%%\s*remind\s*:/i.test(value),
        runner: (state: any, node: any, type: any) => {
            const text: string = String(node.value ?? '');
            let lastIndex = 0;
            let m: RegExpExecArray | null;
            BRACKET_RE.lastIndex = 0;
            while ((m = BRACKET_RE.exec(text)) !== null) {
                const before = text.slice(lastIndex, m.index);
                if (before) state.addText(before);
                const { whenText, attrs } = parseRemindShortcodeMatch(m);
                state.openNode(type, attrs as Record<string, unknown>);
                if (whenText) state.addText(whenText);
                state.closeNode();
                lastIndex = BRACKET_RE.lastIndex;
            }
            const tail = text.slice(lastIndex);
            if (tail) state.addText(tail);
        },
    },
    toMarkdown: {
        match: (node: PMNode) => node.type.name === 'remind',
        runner: (state: any, node: PMNode) => {
            const whenText = (
                node.attrs['whenText'] ||
                node.textContent ||
                ''
            ).toString();
            const iso = node.attrs['whenISO'];
            const status = node.attrs['status'] as RemindStatus | undefined;
            const id = node.attrs['id'];
            const parts: string[] = [];
            if (iso) parts.push(`iso=${iso}`);
            if (status && status !== 'scheduled')
                parts.push(`status=${status}`);
            if (id) parts.push(`id=${id}`);
            const suffix = parts.length ? ` | ${parts.join(',')}` : '';
            state.addNode('text', undefined, undefined, {
                value: `%%remind: ${whenText}${suffix}%%`,
            });
        },
    },
}));

export const remindNode = remindNodeSchema.node;

// --- Input rules
// %%remind: <text> | ...%%
const REMIND_BRACKET_RE = /%%\s*remind\s*:\s*([^|%]+?)(?:\|([^%]+))?%%$/i;
// /remind[space] → insert empty remind node
const REMIND_SLASH_RE = /(^|\s)\/remind\s$/i;

export const remindBracketInputRule = $inputRule((ctx: Ctx) => {
    const type = remindNode.type(ctx);
    return new InputRule(REMIND_BRACKET_RE, (state, match, start, end) => {
        const { whenText, attrs } = parseRemindShortcodeMatch(
            match as RegExpExecArray
        );
        // ensure an id exists
        if (!('id' in attrs) || !attrs.id) {
            attrs.id = `r_${Date.now().toString(36)}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;
        }
        const content = whenText
            ? state.schema.text(whenText)
            : state.schema.text('\u00A0');
        const node = type.create(attrs, content);
        let tr = state.tr.replaceWith(start, end, node);
        // If empty content, place cursor inside the new node
        if (!whenText) {
            tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
        }
        return tr;
    });
});

export const remindSlashInputRule = $inputRule((ctx: Ctx) => {
    const type = remindNode.type(ctx);
    return new InputRule(
        REMIND_SLASH_RE as unknown as RegExp,
        (state, _match, start, end) => {
            const attrs: Record<string, unknown> = {
                kind: 'remind',
                whenText: '',
                id: `r_${Date.now().toString(36)}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
            };
            const content = state.schema.text('\u00A0');
            const node = type.create(attrs, content);
            let tr = state.tr.replaceWith(start, end, node);
            tr = tr.setSelection(TextSelection.create(tr.doc, start + 1));
            return tr;
        }
    );
});

// --- DOM NodeView
export const remindDomView = $view(remindNode, () => (node, view, getPos) => {
    return new RemindView(
        node as PMNode,
        view as unknown as EditorView,
        getPos as unknown as () => number
    );
});

// --- Auto-parse plugin: derive whenISO + status from text
const remindParseKey = new PluginKey('remind-auto-parse');
function parseWhen(text: string): { iso: string | null; note?: string } {
    if (!text || !text.trim()) return { iso: null };
    try {
        // Use chrono-node to parse a broad range of natural language dates
        const dt = chrono.parseDate(text, new Date(), {
            forwardDate: true,
        } as unknown as Record<string, unknown>);
        if (!dt) return { iso: null };
        return { iso: dt.toISOString() };
    } catch (e) {
        return { iso: null };
    }
}

export const remindAutoParseProse = $prose(
    () =>
        new Plugin({
            key: remindParseKey,
            appendTransaction: (_trs, _oldState, newState) => {
                let tr = newState.tr;
                let changed = false;
                const selFrom = newState.selection.from;
                const selTo = newState.selection.to;
                newState.doc.descendants((node, pos) => {
                    if (node.type.name !== 'remind') return;
                    const rawText = (node.textContent || '').toString();
                    // Remove zero-width spaces and NBSP, but only if this wouldn't make the text empty.
                    const cleanedText = rawText.replace(/[\u200B\u00A0]/g, '');
                    if (
                        cleanedText !== rawText &&
                        cleanedText.trim().length > 0
                    ) {
                        // Replace inner content safely; skip if no inner content range
                        const from = pos + 1;
                        const to = pos + node.nodeSize - 1;
                        if (to > from) {
                            tr = tr.insertText(cleanedText, from, to);
                            changed = true;
                        }
                    }
                    // If content is truly empty (no text) and the selection is inside the remind, seed a NBSP once
                    const insideSelection =
                        selFrom >= pos && selTo <= pos + node.nodeSize;
                    if (insideSelection && rawText.length === 0) {
                        const from = pos + 1;
                        const to = pos + node.nodeSize - 1;
                        // Insert only if truly empty range
                        if (to >= from) {
                            tr = tr.insertText('\u00A0', from, to);
                            changed = true;
                        }
                    }
                    // Always derive whenText from current content instead of stale attrs
                    const whenText: string = cleanedText;
                    const parsed = parseWhen(whenText);
                    const prevIso = (node.attrs['whenISO'] as string) || null;
                    // Only update whenISO when the textual content changed or there was no previous ISO.
                    const nextIso =
                        (node.attrs['whenText'] as string) !== whenText ||
                        prevIso == null
                            ? parsed.iso
                            : prevIso;
                    // compute status
                    const prevStatus =
                        (node.attrs['status'] as RemindStatus) || undefined;
                    let nextStatus: RemindStatus = 'scheduled';
                    if (prevStatus) {
                        // preserve explicit status provided by the author (e.g. 'done')
                        nextStatus = prevStatus;
                    } else {
                        if (nextIso) {
                            const t = Date.parse(nextIso);
                            if (!Number.isNaN(t) && t < Date.now())
                                nextStatus = 'overdue';
                        }
                    }
                    // If either attr differs, update
                    if (
                        prevIso !== nextIso ||
                        prevStatus !== nextStatus ||
                        node.attrs['whenText'] !== whenText
                    ) {
                        // preserve existing id attr if present
                        const nextAttrs = {
                            ...node.attrs,
                            whenText,
                            whenISO: nextIso,
                            status: nextStatus,
                        } as Record<string, unknown>;
                        if ('id' in node.attrs && node.attrs.id) {
                            nextAttrs.id = node.attrs.id;
                        }
                        tr = tr.setNodeMarkup(pos, undefined, nextAttrs as any);
                        changed = true;
                    }
                });
                if (!changed) return null;
                return tr;
            },
        })
);

// Remove empty remind nodes automatically (including ZWSP-only)
const removeEmptyRemindKey = new PluginKey('remove-empty-remind');
export const removeEmptyRemindProse = $prose(
    () =>
        new Plugin({
            key: removeEmptyRemindKey,
            appendTransaction: (_trs, _oldState, newState) => {
                const toDelete: Array<{ from: number; to: number }> = [];
                const selFrom = newState.selection.from;
                const selTo = newState.selection.to;
                newState.doc.descendants((node, pos) => {
                    if (node.type.name !== 'remind') return;
                    const normalized = (node.textContent || '')
                        .replace(/[\u200B\u00A0]/g, '')
                        .trim();
                    const insideSelection =
                        selFrom >= pos && selTo <= pos + node.nodeSize;
                    if (normalized.length === 0 && !insideSelection) {
                        toDelete.push({ from: pos, to: pos + node.nodeSize });
                    }
                });
                if (toDelete.length === 0) return null;
                let tr = newState.tr;
                for (let i = toDelete.length - 1; i >= 0; i--) {
                    const { from, to } = toDelete[i];
                    tr = tr.delete(from, to);
                }
                return tr;
            },
        })
);

// Backspace inside an empty remind deletes the bubble
const backspaceDeleteKey = new PluginKey('remind-backspace-delete');
export const remindBackspaceDeleteProse = $prose(
    () =>
        new Plugin({
            key: backspaceDeleteKey,
            props: {
                handleKeyDown(view, event) {
                    if ((event as KeyboardEvent).key !== 'Backspace')
                        return false;
                    const { state } = view;
                    const selFrom = state.selection.from;
                    const selTo = state.selection.to;
                    let found: { from: number; to: number } | null = null;
                    state.doc.descendants((node, pos) => {
                        if (node.type.name !== 'remind') return;
                        const start = pos;
                        const end = pos + node.nodeSize;
                        const inside = selFrom >= start && selTo <= end;
                        if (!inside) return;
                        const cleaned = (node.textContent || '')
                            .replace(/[\u200B\u00A0]/g, '')
                            .trim();
                        if (cleaned.length === 0) {
                            found = { from: start, to: end };
                            // do not early-return to satisfy TS signature
                        }
                    });
                    if (!found) return false;
                    event.preventDefault();
                    event.stopPropagation();
                    const foundPos = found as { from: number; to: number };
                    const delFrom = foundPos.from;
                    const delTo = foundPos.to;
                    let tr = state.tr.delete(delFrom, delTo);
                    const doc = tr.doc;
                    const target = Math.max(
                        1,
                        Math.min(delFrom, doc.content.size - 1)
                    );
                    try {
                        const sel = TextSelection.create(doc, target);
                        tr = tr.setSelection(sel);
                    } catch {
                        try {
                            const $pos = doc.resolve(target);
                            const sel = Selection.near($pos, -1);
                            tr = tr.setSelection(sel);
                        } catch {
                            tr = tr.setSelection(Selection.atEnd(doc));
                        }
                    }
                    view.dispatch(tr.scrollIntoView());
                    return true;
                },
            },
        })
);

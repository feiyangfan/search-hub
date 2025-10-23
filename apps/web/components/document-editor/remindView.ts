import type { EditorView, NodeView } from 'prosemirror-view';
import type { Node as PMNode } from 'prosemirror-model';
import { TextSelection, Selection } from 'prosemirror-state';

export class RemindView implements NodeView {
    dom: HTMLElement;
    contentDOM: HTMLElement;
    private view: EditorView;
    private getPos?: () => number;
    private onKeyDown: (e: KeyboardEvent) => void;
    // Guard PM from handling specific keys while we reposition the selection
    stopEvent?(event: Event): boolean;

    constructor(node: PMNode, _view: EditorView, _getPos?: () => number) {
        const span = document.createElement('span');
        span.setAttribute('data-remind', '');
        span.setAttribute('data-status', node.attrs['status'] ?? 'scheduled');
        span.className = `pm-remind pm-remind-${
            node.attrs['status'] ?? 'scheduled'
        }`;

        const icon = document.createElement('span');
        icon.className = 'pm-remind__icon';
        icon.textContent = '⏰: ';

        const content = document.createElement('span');
        content.className = 'pm-remind__content';

        const hint = document.createElement('span');
        hint.className = 'pm-remind__hint';
        // initialize hint text from attrs.whenISO if present
        try {
            const iso = node.attrs['whenISO'] ?? null;
            if (iso) {
                const d = new Date(String(iso));
                if (!Number.isNaN(d.getTime())) {
                    hint.textContent = ` · ${d.toLocaleString()}`;
                }
            }
        } catch {}

        span.appendChild(icon);
        span.appendChild(content);
        span.appendChild(hint);
        this.dom = span;
        this.contentDOM = content;
        this.view = _view;
        this.getPos = _getPos;

        // Only handle Backspace deletion when empty; Enter behavior is left to default
        this.onKeyDown = (e: KeyboardEvent) => {
            // Handle Backspace when content is empty: delete the whole remind node
            if (e.key === 'Backspace') {
                const text = (this.contentDOM.textContent || '')
                    .replace(/[\u200B\u00A0]/g, '')
                    .trim();
                if (text.length === 0 && this.getPos) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const from = this.getPos();
                        const node = this.view.state.doc.nodeAt(from);
                        const to = from + (node ? node.nodeSize : 1);
                        let tr = this.view.state.tr.delete(from, to);
                        const doc = tr.doc;
                        // Prefer a text selection near the deletion point
                        const target = Math.max(
                            1,
                            Math.min(from, doc.content.size - 1)
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
                        this.view.dispatch(tr.scrollIntoView());
                        this.view.focus();
                    } catch {
                        // no-op
                    }
                }
            }
        };
        this.contentDOM.addEventListener('keydown', this.onKeyDown, true);

        // Stop default Backspace when empty so our custom delete runs cleanly
        this.stopEvent = (event: Event) => {
            if (event.type === 'keydown') {
                const e = event as KeyboardEvent;
                if (e.key === 'Backspace') {
                    const text = (this.contentDOM.textContent || '')
                        .replace(/[\u200B\u00A0]/g, '')
                        .trim();
                    if (text.length === 0) return true;
                }
            }
            return false;
        };
    }

    update(node: PMNode) {
        if (node.type.name !== 'remind') return false;
        this.dom.setAttribute(
            'data-status',
            node.attrs['status'] ?? 'scheduled'
        );
        this.dom.className = `pm-remind pm-remind-${
            node.attrs['status'] ?? 'scheduled'
        }`;
        // update hint text (show formatted whenISO if present)
        try {
            const hintEl = this.dom.querySelector('.pm-remind__hint');
            const iso = node.attrs['whenISO'] ?? null;
            if (hintEl) {
                if (iso) {
                    const d = new Date(String(iso));
                    if (!Number.isNaN(d.getTime())) {
                        hintEl.textContent = ` · ${d.toLocaleString()}`;
                    } else {
                        hintEl.textContent = '';
                    }
                } else {
                    hintEl.textContent = '';
                }
            }
        } catch {}
        return true;
    }

    destroy() {
        this.contentDOM.removeEventListener('keydown', this.onKeyDown, true);
    }
}

/**
 * Markdown-aware chunking for semantic search
 *
 * - Preserves structure (headings, lists, code blocks)
 * - Tracks heading hierarchy (breadcrumb context)
 * - Generates raw markdown (citations) + searchText (embeddings/BM25)
 * - Splits on: real headings, pseudo-headings (deterministic), thematic breaks
 * - Preserves code formatting in searchText
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { toString as mdastToString } from 'mdast-util-to-string';
import type {
    Root,
    RootContent,
    Heading,
    Paragraph,
    Code,
    List,
    Blockquote,
    ThematicBreak,
} from 'mdast';

export interface MarkdownChunk {
    idx: number;
    rawMarkdown: string;
    searchText: string;
    headingPath: string[];
    startPos: number; // -1 when unavailable
    endPos: number; // -1 when unavailable
}

interface ChunkingOptions {
    chunkSize?: number; // max chars of searchText target
    overlapBlocks?: number; // overlap by blocks (excluding boundary blocks)
    maxHeadingDepth?: number; // max heading depth tracked in breadcrumb
    enablePseudoHeadings?: boolean;
}

type SectionKind = 'boundary' | 'block';

interface Section {
    kind: SectionKind;
    markdown: string;
    searchText: string;
    headingPath: string[];
    startPos: number;
    endPos: number;
    isBoundary: boolean; // heading/pseudo/thematicBreak
}

/** Stringify nodes back to markdown (fallback when offsets unavailable) */
const mdStringifier = unified().use(remarkStringify);
function stringifyNode(node: RootContent): string {
    const root: Root = { type: 'root', children: [node] };
    return String(mdStringifier.stringify(root)).trim();
}

function normalizeProse(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

/** Prefer slicing original markdown by offsets; fallback to stringify if offsets missing */
function rawMarkdownFromNode(
    node: RootContent,
    full: string
): { md: string; start: number; end: number } {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;

    if (
        typeof start === 'number' &&
        typeof end === 'number' &&
        start >= 0 &&
        end >= start
    ) {
        return { md: full.slice(start, end), start, end };
    }

    // Offsets unavailable: fallback to stringify; positions unknown
    return { md: stringifyNode(node), start: -1, end: -1 };
}

function isHeading(node: RootContent): node is Heading {
    return node.type === 'heading';
}
function isParagraph(node: RootContent): node is Paragraph {
    return node.type === 'paragraph';
}
function isCode(node: RootContent): node is Code {
    return node.type === 'code';
}
function isList(node: RootContent): node is List {
    return node.type === 'list';
}
function isBlockquote(node: RootContent): node is Blockquote {
    return node.type === 'blockquote';
}
function isThematicBreak(node: RootContent): node is ThematicBreak {
    return node.type === 'thematicBreak';
}

/**
 * Deterministic pseudo-heading detection.
 * Conservative rules:
 * - Short line
 * - Ends with ":" OR matches common section opener keywords
 * - Or starts with emphasized/inline-code content and is short
 */
function isPseudoHeadingParagraph(node: Paragraph): boolean {
    const text = mdastToString(node).trim();
    if (!text) return false;
    if (text.length > 120) return false;

    if (text.endsWith(':')) return true;

    // Keyword openers (tune for your corpus)
    if (
        /^(when|why|how|example|examples|templates?|core idea|invariants?|notes?)\b/i.test(
            text
        )
    )
        return true;

    // Strong/emphasis/code-leading short lines often act like titles
    const first = node.children?.[0];
    if (
        first &&
        (first.type === 'strong' ||
            first.type === 'emphasis' ||
            first.type === 'inlineCode')
    ) {
        return text.length <= 80;
    }

    return false;
}

/** Extract “searchText” from a node without re-parsing markdown */
function searchTextFromNode(node: RootContent): string {
    if (isCode(node)) {
        // Preserve formatting for code; normalize line endings only
        return (node.value ?? '').replace(/\r\n/g, '\n').trim();
    }

    if (isList(node)) {
        // Preserve item boundaries better than a flat toString
        const items = (node.children ?? []).map((li) =>
            normalizeProse(mdastToString(li))
        );
        return items.filter(Boolean).join('\n');
    }

    if (isBlockquote(node)) {
        // Keep quote content but flatten whitespace
        return normalizeProse(mdastToString(node));
    }

    // Default prose: flatten whitespace
    return normalizeProse(mdastToString(node));
}

/**
 * Split markdown into sections based on:
 * - real headings (boundary)
 * - pseudo headings (boundary, if enabled)
 * - thematic breaks (boundary)
 * - other blocks (non-boundary)
 *
 * Also maintains:
 * - headingStack (real headings)
 * - currentPseudo (pseudo section label) applied to subsequent blocks until next boundary
 */
function splitIntoSections(
    markdown: string,
    opts: Required<
        Pick<ChunkingOptions, 'maxHeadingDepth' | 'enablePseudoHeadings'>
    >
): Section[] {
    const sections: Section[] = [];
    const headingStack: { depth: number; text: string }[] = [];
    let currentPseudo: string | null = null;

    const tree = unified().use(remarkParse).parse(markdown);

    function currentHeadingPath(): string[] {
        // Apply maxHeadingDepth (cap tracked headings)
        return headingStack
            .filter((h) => h.depth <= opts.maxHeadingDepth)
            .map((h) => h.text);
    }

    function effectivePath(extra?: string | null): string[] {
        const base = currentHeadingPath();
        if (extra && extra.trim()) return [...base, extra.trim()];
        if (currentPseudo) return [...base, currentPseudo];
        return base;
    }

    function updateHeadingStack(h: Heading) {
        const depth = h.depth;
        const title = mdastToString(h).trim();

        while (headingStack.length > 0) {
            const last = headingStack.at(-1);
            if (!last || last.depth < depth) break;
            headingStack.pop();
        }
        headingStack.push({ depth, text: title });

        // Real heading resets pseudo context
        currentPseudo = null;
    }

    for (const node of tree.children ?? []) {
        // Real heading: boundary
        if (isHeading(node)) {
            updateHeadingStack(node);

            const { md, start, end } = rawMarkdownFromNode(node, markdown);
            sections.push({
                kind: 'boundary',
                markdown: md.trim(),
                searchText: normalizeProse(mdastToString(node)),
                headingPath: effectivePath(null), // includes this heading via headingStack
                startPos: start,
                endPos: end,
                isBoundary: true,
            });
            continue;
        }

        // Thematic break: boundary (*** / ---)
        if (isThematicBreak(node)) {
            const { md, start, end } = rawMarkdownFromNode(node, markdown);
            // Thematic break also resets pseudo context
            currentPseudo = null;

            sections.push({
                kind: 'boundary',
                markdown: md.trim(),
                searchText: '', // not useful for embeddings
                headingPath: effectivePath(null),
                startPos: start,
                endPos: end,
                isBoundary: true,
            });
            continue;
        }

        // Pseudo-heading paragraph: boundary (optional)
        if (
            opts.enablePseudoHeadings &&
            isParagraph(node) &&
            isPseudoHeadingParagraph(node)
        ) {
            const pseudoTitle = mdastToString(node).trim().replace(/:\s*$/, '');
            currentPseudo = pseudoTitle;

            const { md, start, end } = rawMarkdownFromNode(node, markdown);
            sections.push({
                kind: 'boundary',
                markdown: md.trim(),
                searchText: normalizeProse(mdastToString(node)),
                headingPath: effectivePath(pseudoTitle),
                startPos: start,
                endPos: end,
                isBoundary: true,
            });
            continue;
        }

        // Other block content
        const { md, start, end } = rawMarkdownFromNode(node, markdown);
        const st = searchTextFromNode(node);

        if (md.trim() || st.trim()) {
            sections.push({
                kind: 'block',
                markdown: md.trim(),
                searchText: st.trim(),
                headingPath: effectivePath(null),
                startPos: start,
                endPos: end,
                isBoundary: false,
            });
        }
    }

    return sections;
}

/**
 * Merge sections into chunks.
 * Splits on:
 * - boundaries (heading/pseudo/thematicBreak)
 * - size threshold
 *
 * Overlap:
 * - overlaps only non-boundary blocks (avoids duplicating headings into next chunk)
 */
function mergeSectionsIntoChunks(
    sections: Section[],
    chunkSize: number,
    overlapBlocks: number
): MarkdownChunk[] {
    const chunks: MarkdownChunk[] = [];
    if (!sections.length) return chunks;

    let buf: Section[] = [];

    function flush() {
        if (!buf.length) return;

        const rawMarkdown = buf
            .map((s) => s.markdown)
            .filter(Boolean)
            .join('\n\n')
            .trim();
        const searchText = buf
            .map((s) => s.searchText)
            .filter(Boolean)
            .join('\n\n')
            .trim();

        // Skip chunks with no searchable content (e.g., only thematic breaks)
        if (!searchText) {
            return;
        }

        // Choose headingPath from the first boundary in this buffer if present, else first section
        const boundary = buf.find((s) => s.isBoundary && s.headingPath.length);

        const first = buf[0];
        if (!first) return;
        const headingPath = (boundary ?? first).headingPath;

        const startPos = buf.find((s) => s.startPos >= 0)?.startPos ?? -1;
        const endPos =
            [...buf].reverse().find((s) => s.endPos >= 0)?.endPos ?? -1;

        chunks.push({
            idx: chunks.length,
            rawMarkdown,
            searchText,
            headingPath,
            startPos,
            endPos,
        });
    }

    function bufferSize(next?: Section): number {
        const base = buf
            .map((s) => s.searchText)
            .filter(Boolean)
            .join('\n\n');
        if (!next) return base.length;
        const add = next.searchText
            ? (base ? '\n\n' : '') + next.searchText
            : '';
        return (base + add).length;
    }

    function startNewBufferWithOverlap(next: Section) {
        // Overlap only non-boundary blocks from the end of buf
        const candidates = buf.filter((s) => !s.isBoundary && s.searchText);
        const overlap = candidates.slice(
            Math.max(0, candidates.length - overlapBlocks)
        );

        buf = [...overlap, next];
    }

    for (const section of sections) {
        // Boundary starts a new chunk (but we include the boundary section at the start of the new chunk)
        if (section.isBoundary && buf.length > 0) {
            flush();
            buf = [section];
            continue;
        }

        // Size-based split
        if (buf.length > 0 && bufferSize(section) > chunkSize) {
            flush();
            startNewBufferWithOverlap(section);
            continue;
        }

        buf.push(section);
    }

    flush();
    return chunks;
}

export function chunkMarkdown(
    markdown: string,
    options: ChunkingOptions = {}
): MarkdownChunk[] {
    const {
        chunkSize = 2500,
        overlapBlocks = 1,
        maxHeadingDepth = 3,
        enablePseudoHeadings = true,
    } = options;

    if (!markdown?.trim()) return [];

    const sections = splitIntoSections(markdown, {
        maxHeadingDepth,
        enablePseudoHeadings,
    });

    return mergeSectionsIntoChunks(sections, chunkSize, overlapBlocks);
}

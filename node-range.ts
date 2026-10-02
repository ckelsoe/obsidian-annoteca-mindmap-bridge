// The text a "comment on this node" asks Annoteca to cover: the node's source
// line without its markdown markup (heading, list bullet, task box, quote)
// and without any HTML comment syntax. Pure.
//
// The same rules as Annoteca's own outline tree, so a comment made from the
// map covers what a comment made from the outline would. Annoteca's
// compose() refuses a range that overlaps comment syntax, so a comment
// already inside the line stops the range before it rather than wrapping it.

export interface TextRange {
	readonly start: number;
	readonly end: number;
}

const HEADING_PREFIX = /^[ \t]{0,3}#{1,6}[ \t]+/;
const ITEM_PREFIX =
	/^[ \t]*(?:>[ \t]?)*(?:[-*+]|\d+[.)])[ \t]+(?:\[[^\]\n]\][ \t]+)?/;
const QUOTE_PREFIX = /^[ \t]*(?:>[ \t]?)+/;

// Every stretch of HTML comment syntax on one line, as offsets into the
// line. A comment opened on this line and closed on a later one runs to the
// line's end; one closed here but opened on an earlier line runs from its
// start.
export function commentSpans(line: string): TextRange[] {
	const spans: TextRange[] = [];
	let at = 0;
	const firstOpen = line.indexOf('<!--');
	const firstClose = line.indexOf('-->');
	if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
		spans.push({ start: 0, end: firstClose + 3 });
		at = firstClose + 3;
	}
	for (;;) {
		const open = line.indexOf('<!--', at);
		if (open === -1) break;
		const close = line.indexOf('-->', open + 4);
		const end = close === -1 ? line.length : close + 3;
		spans.push({ start: open, end });
		at = end;
	}
	return spans;
}

function isSpace(ch: string): boolean {
	return ch === ' ' || ch === '\t';
}

// `line` is the node's 0-based source line. Returns null when the line holds
// no text a comment could cover.
export function composeRange(text: string, line: number): TextRange | null {
	if (line < 0) return null;
	let from = 0;
	for (let i = 0; i < line; i++) {
		const next = text.indexOf('\n', from);
		if (next === -1) return null;
		from = next + 1;
	}
	const lineEnd = text.indexOf('\n', from);
	const to = lineEnd === -1 ? text.length : lineEnd;
	const raw = text.slice(from, to);
	const spans = commentSpans(raw);
	const prefix =
		HEADING_PREFIX.exec(raw) ??
		ITEM_PREFIX.exec(raw) ??
		QUOTE_PREFIX.exec(raw);
	let start = prefix ? prefix[0].length : 0;
	// Step over leading space and any comment syntax the text starts with.
	for (;;) {
		while (start < raw.length && isSpace(raw.charAt(start))) start += 1;
		const lead = spans.find((s) => s.start <= start && s.end > start);
		if (!lead) break;
		start = lead.end;
	}
	// A comment inside the line ends the range before it.
	const inner = spans.find((s) => s.start > start);
	let end = inner ? inner.start : raw.length;
	for (;;) {
		while (end > start && isSpace(raw.charAt(end - 1))) end -= 1;
		const trail = spans.find((s) => s.end === end && s.start < end);
		if (!trail || trail.start < start) break;
		end = trail.start;
	}
	if (end <= start) return null;
	return { start: from + start, end: from + end };
}

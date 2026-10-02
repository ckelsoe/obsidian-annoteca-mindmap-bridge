// Which map node a note line belongs to. Pure, so it is tested without a map.
//
// A line drawn inside a node (its own line, or one of its body lines) belongs
// to that node. Any other line belongs to the nearest drawn node at or above
// it. That second rule is what gives a collapsed node the comments in its
// hidden branch: a collapsed branch draws no descendants, so their lines fall
// to the collapsed node above them. It also catches lines the map does not
// draw at all, such as body text while the map hides body text.

export interface LineOwner {
	readonly line: number;
	readonly bodyLines: readonly number[];
}

export interface Ownership<N> {
	readonly node: N;
	// True when the line is drawn inside the node, false when it only falls
	// to the node (a hidden branch or undrawn text).
	readonly drawn: boolean;
}

// Offsets at which each line starts, for text whose line breaks are all \n.
export function lineStarts(text: string): number[] {
	const starts = [0];
	for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1))
		starts.push(i + 1);
	return starts;
}

// The 0-based line holding `offset`.
export function lineAt(starts: readonly number[], offset: number): number {
	let lo = 0;
	let hi = starts.length - 1;
	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if ((starts[mid] ?? 0) <= offset) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

export function lineOwners<N extends LineOwner>(
	nodes: readonly N[],
): (line: number) => Ownership<N> | undefined {
	const drawn = new Map<number, N>();
	for (const node of nodes) {
		drawn.set(node.line, node);
		for (const body of node.bodyLines)
			if (!drawn.has(body)) drawn.set(body, node);
	}
	const byLine = [...nodes].sort((a, b) => a.line - b.line);
	return (line: number): Ownership<N> | undefined => {
		const direct = drawn.get(line);
		if (direct) return { node: direct, drawn: true };
		let above: N | undefined;
		for (const node of byLine) {
			if (node.line > line) break;
			above = node;
		}
		return above ? { node: above, drawn: false } : undefined;
	};
}

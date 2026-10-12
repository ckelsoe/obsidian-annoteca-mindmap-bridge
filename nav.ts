// Which node "go to next/previous node with comments" lands on. Pure.

// `lines` are the badged nodes' lines; `current` is the selected node's line,
// or null when nothing is selected. Wraps at either end. Undefined when no
// node has a badge.
export function stepTo(
	lines: readonly number[],
	current: number | null,
	direction: 1 | -1,
): number | undefined {
	const sorted = [...new Set(lines)].sort((a, b) => a - b);
	const first = sorted[0];
	const last = sorted[sorted.length - 1];
	if (current === null) return direction === 1 ? first : last;
	if (direction === 1) return sorted.find((line) => line > current) ?? first;
	const before = sorted.filter((line) => line < current);
	return before[before.length - 1] ?? last;
}

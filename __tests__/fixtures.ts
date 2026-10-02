// Shared test data: Annoteca comments placed by text, and a note.

import type { ApiComment } from '../annoteca-api';

// A note whose markers are one-line lean markers, as end-of-file storage
// writes them.
export const NOTE = [
	'# Plan', // 0
	'- review steps <!-- annoteca/clarify: [id=a] -->', // 1
	'  - automate 6 <!-- annoteca/tone: [id=b] -->', // 2
	'- ship it', // 3
	'Closing words <!-- annoteca/cut: [id=c] -->', // 4
].join('\n');

let seq = 0;

// A comment whose marker is the first occurrence of `marker` in `text`.
export function commentAt(
	text: string,
	marker: string,
	over: Partial<ApiComment> = {},
): ApiComment {
	const start = text.indexOf(marker);
	if (start === -1) throw new Error(`marker not in text: ${marker}`);
	seq += 1;
	return {
		id: `id${seq}`,
		path: 'notes/plan.md',
		category: 'clarify',
		body: `Comment ${seq}`,
		author: undefined,
		date: undefined,
		resolved: false,
		addressed: false,
		replyCount: 0,
		anchor: undefined,
		marker: { start, end: start + marker.length },
		...over,
	};
}

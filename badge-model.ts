// What each map node's badge shows, from the note's comments. Pure.

import type { ApiComment } from './annoteca-api';
import { lineAt, lineOwners, lineStarts } from './line-map';
import type { LineOwner } from './line-map';

interface NodeComment {
	readonly comment: ApiComment;
	// False when the comment sits in a collapsed branch or in text the map
	// does not draw.
	readonly drawn: boolean;
}

export interface NodeBadge {
	readonly open: number;
	readonly resolved: number;
	// Comments not drawn on the map but counted on this node.
	readonly hidden: number;
	// The category the badge is coloured by: the first open comment's, or the
	// first comment's when every one is resolved.
	readonly category: string;
	// In note order.
	readonly comments: readonly NodeComment[];
}

// `text` is the note text the comments' marker offsets count into.
export function badgesFor<N extends LineOwner>(
	nodes: readonly N[],
	comments: readonly ApiComment[],
	text: string,
): Map<N, NodeBadge> {
	const starts = lineStarts(text);
	const ownerOf = lineOwners(nodes);
	const grouped = new Map<N, NodeComment[]>();
	const inOrder = [...comments].sort(
		(a, b) => a.marker.start - b.marker.start,
	);
	for (const comment of inOrder) {
		const owner = ownerOf(lineAt(starts, comment.marker.start));
		if (!owner) continue;
		const list = grouped.get(owner.node) ?? [];
		list.push({ comment, drawn: owner.drawn });
		grouped.set(owner.node, list);
	}
	const badges = new Map<N, NodeBadge>();
	for (const [node, list] of grouped) {
		const firstOpen = list.find((c) => !c.comment.resolved);
		const first = firstOpen ?? list[0];
		if (!first) continue;
		const open = list.filter((c) => !c.comment.resolved).length;
		badges.set(node, {
			open,
			resolved: list.length - open,
			hidden: list.filter((c) => !c.drawn).length,
			category: first.comment.category,
			comments: list,
		});
	}
	return badges;
}

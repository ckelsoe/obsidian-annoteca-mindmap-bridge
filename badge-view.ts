// The bridge's own element on a map node: a comment-count badge. Appended
// inside the node element and absolutely positioned by styles.css, so it
// never changes the node's measured size. Removed and redrawn freely: the map
// plugin owns the node, not the bridge.

import type { MapNode } from './adapters/map-adapter';
import type { NodeBadge } from './badge-model';

const BADGE_CLASS = 'annoteca-mmb-badge';

function plural(n: number, word: string): string {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function badgeLabel(badge: NodeBadge): string {
	const parts: string[] = [];
	if (badge.open > 0) parts.push(plural(badge.open, 'open comment'));
	if (badge.resolved > 0)
		parts.push(plural(badge.resolved, 'resolved comment'));
	let label = parts.join(', ');
	if (badge.hidden > 0)
		label += `; ${badge.hidden} in a collapsed branch or hidden text`;
	return label;
}

// A string that changes whenever anything the badge shows or acts on does,
// so an unchanged badge is left alone instead of being rebuilt on every
// redraw of the map.
function signature(badge: NodeBadge): string {
	return JSON.stringify([
		badge.category,
		badge.open,
		badge.resolved,
		badge.hidden,
		badge.comments.map((c) => [
			c.comment.id ?? '',
			c.comment.category,
			c.comment.resolved,
			c.comment.body,
		]),
	]);
}

function ownChild(node: HTMLElement, cls: string): HTMLElement | null {
	for (const child of Array.from(node.children))
		if (child.instanceOf(HTMLElement) && child.hasClass(cls)) return child;
	return null;
}

function drawBadge(node: MapNode, badge: NodeBadge | undefined): void {
	const existing = ownChild(node.el, BADGE_CLASS);
	if (!badge) {
		existing?.remove();
		return;
	}
	const sig = signature(badge);
	if (existing?.dataset.annotecaMmbSig === sig) return;
	existing?.remove();
	const shown = badge.open > 0 ? badge.open : badge.resolved;
	const el = node.el.createSpan({
		cls: [BADGE_CLASS, `annoteca-cat-${badge.category}`],
		text: String(shown),
		attr: { 'aria-label': badgeLabel(badge) },
	});
	el.dataset.annotecaMmbSig = sig;
	el.toggleClass('is-resolved', badge.open === 0);
	el.toggleClass('has-hidden', badge.hidden > 0);
}

export function drawNodeControls(
	nodes: readonly MapNode[],
	badges: ReadonlyMap<MapNode, NodeBadge>,
): void {
	for (const node of nodes) drawBadge(node, badges.get(node));
}

export function clearNodeControls(canvas: HTMLElement): void {
	for (const el of Array.from(canvas.querySelectorAll(`.${BADGE_CLASS}`)))
		el.remove();
}

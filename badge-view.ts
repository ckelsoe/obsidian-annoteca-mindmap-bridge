// The bridge's own marks on a map node: a comment-count badge, a "+"
// control, and an optional tint. Appended inside the node element and
// absolutely positioned by styles.css, so they never change the node's
// measured size. Removed and redrawn freely: the map plugin owns the node,
// not the bridge.

import type { MapNode } from './adapters/map-adapter';
import { tintLevel } from './badge-model';
import type { NodeBadge } from './badge-model';

const BADGE_CLASS = 'annoteca-mmb-badge';
const ADD_CLASS = 'annoteca-mmb-add';
const TINT_CLASS = 'annoteca-mmb-tint';

// Handlers get the node ELEMENT, not a snapshot of the node: they look its
// line and comments up again when the click happens.
export interface NodeControlActions {
	openBadge(nodeEl: HTMLElement, anchor: HTMLElement): void;
	addComment(nodeEl: HTMLElement, anchor: HTMLElement): void;
}

// The node element's own listeners select, edit, drag and open a menu on the
// node. A press on the bridge's controls must reach none of them.
const SWALLOWED = [
	'pointerdown',
	'mousedown',
	'dblclick',
	'contextmenu',
] as const;

function guard(el: HTMLElement): void {
	for (const type of SWALLOWED)
		el.addEventListener(type, (evt) => evt.stopPropagation());
}

// A span acting as a button, not a <button>: themes restyle every button
// (size, padding, background, even position) with selectors the bridge
// cannot reliably outrank, and the control must stay a small mark on the
// node's corner. role, tabindex and Enter/Space keep it a button for the
// keyboard and screen readers.
function control(
	node: MapNode,
	cls: string[],
	text: string,
	label: string,
	onPress: (el: HTMLElement) => void,
): HTMLElement {
	const el = node.el.createSpan({
		cls,
		text,
		attr: { role: 'button', tabindex: '0', 'aria-label': label },
	});
	guard(el);
	el.addEventListener('click', (evt) => {
		evt.stopPropagation();
		onPress(el);
	});
	el.addEventListener('keydown', (evt) => {
		if (evt.key !== 'Enter' && evt.key !== ' ') return;
		// The map has its own keys (Enter edits, Space folds); a key on the
		// control belongs to the control.
		evt.preventDefault();
		evt.stopPropagation();
		onPress(el);
	});
	return el;
}

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

// A string that changes whenever anything the badge shows does, so an
// unchanged badge is left alone instead of being rebuilt on every redraw.
function signature(badge: NodeBadge): string {
	return JSON.stringify([
		badge.category,
		badge.open,
		badge.resolved,
		badge.hidden,
	]);
}

function ownChild(node: HTMLElement, cls: string): HTMLElement | null {
	for (const child of Array.from(node.children))
		if (child.instanceOf(HTMLElement) && child.hasClass(cls)) return child;
	return null;
}

function drawBadge(
	node: MapNode,
	badge: NodeBadge | undefined,
	actions: NodeControlActions,
): void {
	const existing = ownChild(node.el, BADGE_CLASS);
	// A keyboard user on the badge keeps their place when it is replaced:
	// focus moves to the new badge, or to the node's "+" when it goes.
	const hadFocus =
		existing !== null && existing.doc.activeElement === existing;
	if (!badge) {
		existing?.remove();
		if (hadFocus) ownChild(node.el, ADD_CLASS)?.focus();
		return;
	}
	const sig = signature(badge);
	if (existing?.dataset.annotecaMmbSig === sig) return;
	existing?.remove();
	const shown = badge.open > 0 ? badge.open : badge.resolved;
	const el = control(
		node,
		[BADGE_CLASS, `annoteca-cat-${badge.category}`],
		String(shown),
		badgeLabel(badge),
		(anchor) => actions.openBadge(node.el, anchor),
	);
	el.dataset.annotecaMmbSig = sig;
	el.toggleClass('is-resolved', badge.open === 0);
	el.toggleClass('has-hidden', badge.hidden > 0);
	if (hadFocus) el.focus();
}

// An overlay over the whole node, never a style on the map's own element,
// so a theme's node colours and the map's branch colours are untouched.
function drawTint(
	node: MapNode,
	badge: NodeBadge | undefined,
	on: boolean,
): void {
	const level = on && badge ? tintLevel(badge.open) : 0;
	const existing = ownChild(node.el, TINT_CLASS);
	if (level === 0) {
		existing?.remove();
		return;
	}
	if (existing?.dataset.annotecaMmbLevel === String(level)) return;
	existing?.remove();
	const el = node.el.createSpan({
		cls: [TINT_CLASS, `is-level-${level}`],
		attr: { 'aria-hidden': 'true' },
	});
	el.dataset.annotecaMmbLevel = String(level);
}

function drawAdd(node: MapNode, actions: NodeControlActions): void {
	// The root stands for the note itself and has no line to comment on.
	if (node.line < 0 || ownChild(node.el, ADD_CLASS)) return;
	control(node, [ADD_CLASS], '+', 'Comment on this node', (anchor) =>
		actions.addComment(node.el, anchor),
	);
}

export function drawNodeControls(
	nodes: readonly MapNode[],
	badges: ReadonlyMap<MapNode, NodeBadge>,
	actions: NodeControlActions,
	options: { readonly tint: boolean },
): void {
	for (const node of nodes) {
		const badge = badges.get(node);
		drawTint(node, badge, options.tint);
		drawBadge(node, badge, actions);
		drawAdd(node, actions);
	}
}

export function clearNodeControls(canvas: HTMLElement): void {
	for (const el of Array.from(
		canvas.querySelectorAll(
			`.${BADGE_CLASS}, .${ADD_CLASS}, .${TINT_CLASS}`,
		),
	))
		el.remove();
}

// Adapter for Mind map editor (`mindmap-editor`, vulture039). The only file
// that knows how that plugin draws a map. Its author has said its internals
// may still change, so every assumption below is a fact checked against its
// source (1.8.1, commit 1177df1) and must be re-checked on each of its
// releases:
//
// - The view type is `mindmap-editor`, and its view state carries `file`, the
//   note's path.
// - Nodes are drawn into `div.mindmap-canvas`. While a render is staged, a
//   clone of the old canvas with the extra class `mindmap-render-snapshot`
//   stands beside it; that clone is never the live map.
// - Each node is a direct child `div.mindmap-node` with `data-line`, its
//   0-based source line (-1 for the root, which stands for the note). The
//   "n done" pill is also a `.mindmap-node`, with class
//   `mindmap-node-summary` and no `data-line`.
// - A node's own text lines are `div.mindmap-node-body-line` elements inside
//   it, each with its own `data-line`.
// - A redraw empties the canvas and appends fresh node elements, so a change
//   to the canvas's direct children is the signal that badges are gone.
// - A selected node carries the class `is-selected`. styles.css uses it,
//   with `mindmap-node`, to show the "+" button on the selected node, which
//   is how a touch screen reaches it.

import type { WorkspaceLeaf } from 'obsidian';
import type { MapAdapter, MapNode, MapRead } from './map-adapter';

const VIEW_TYPE = 'mindmap-editor';
const CANVAS = 'mindmap-canvas';
const SNAPSHOT = 'mindmap-render-snapshot';
const NODE = 'mindmap-node';
const SUMMARY = 'mindmap-node-summary';
const BODY_LINE = 'mindmap-node-body-line';

function lineOf(el: HTMLElement): number | null {
	const raw = el.dataset.line;
	if (raw === undefined || !/^-?\d+$/.test(raw)) return null;
	return Number(raw);
}

export const mindmapEditorAdapter: MapAdapter = {
	pluginId: 'mindmap-editor',
	pluginName: 'Mind map editor',
	viewType: VIEW_TYPE,

	notePath(leaf: WorkspaceLeaf): string | null {
		// getViewState, not the view: it answers for a deferred leaf too.
		const state = leaf.getViewState();
		if (state.type !== VIEW_TYPE) return null;
		const file = state.state?.file;
		return typeof file === 'string' && file !== '' ? file : null;
	},

	canvas(leaf: WorkspaceLeaf): HTMLElement | null {
		if (leaf.isDeferred) return null;
		if (leaf.view.getViewType() !== VIEW_TYPE) return null;
		return leaf.view.containerEl.querySelector<HTMLElement>(
			`.${CANVAS}:not(.${SNAPSHOT})`,
		);
	},

	noticeHost(leaf: WorkspaceLeaf): HTMLElement | null {
		if (leaf.isDeferred) return null;
		if (leaf.view.getViewType() !== VIEW_TYPE) return null;
		return leaf.view.containerEl.querySelector<HTMLElement>(
			':scope > .view-content',
		);
	},

	readNodes(canvas: HTMLElement): MapRead {
		const nodes: MapNode[] = [];
		for (const child of Array.from(canvas.children)) {
			if (!child.instanceOf(HTMLElement) || !child.hasClass(NODE))
				continue;
			const line = lineOf(child);
			if (line === null) {
				if (child.hasClass(SUMMARY)) continue;
				return {
					kind: 'broken',
					reason: 'a map node has no source line',
				};
			}
			const bodyLines: number[] = [];
			for (const bodyEl of Array.from(
				child.querySelectorAll<HTMLElement>(`.${BODY_LINE}`),
			)) {
				const bodyLine = lineOf(bodyEl);
				if (bodyLine !== null) bodyLines.push(bodyLine);
			}
			nodes.push({ el: child, line, bodyLines });
		}
		return { kind: 'nodes', nodes };
	},

	touchesNodes(record: MutationRecord): boolean {
		return record.type === 'childList';
	},
};

// A map drawn the way Mind map editor 1.8.1 draws one (mindmap-view.ts,
// buildNode / addBodyText / buildDonePill / makeToggle / render), so the
// adapter and decorator are tested against that shape, not an invented one.

import type { WorkspaceLeaf } from 'obsidian';

export interface NodeSpec {
	line: number;
	text: string;
	body?: number[];
}

export interface MapFixture {
	leaf: WorkspaceLeaf;
	container: HTMLElement;
	canvas: HTMLElement;
	// Mind map editor's redraw: empty the canvas, append fresh nodes.
	redraw(nodes: readonly NodeSpec[]): void;
	nodeEl(line: number): HTMLElement;
	// Show another note, as the map does when it follows the active file.
	showNote(path: string): void;
}

function drawNodes(canvas: HTMLElement, nodes: readonly NodeSpec[]): void {
	canvas.empty();
	// Stands in for the edges <svg>, also a canvas child.
	canvas.createDiv({ cls: 'mindmap-edges' });
	for (const spec of nodes) {
		const el = canvas.createDiv({
			cls: [
				'mindmap-node',
				spec.line < 0 ? 'mindmap-node-root' : 'mindmap-node-list',
			],
		});
		el.dataset.line = String(spec.line);
		const head = el.createDiv({ cls: 'mindmap-node-head' });
		head.createSpan({ cls: 'mindmap-node-text', text: spec.text });
		if (spec.body?.length) {
			const body = el.createDiv({ cls: 'mindmap-node-body' });
			for (const line of spec.body) {
				const lineEl = body.createDiv({
					cls: 'mindmap-node-body-line',
				});
				lineEl.dataset.line = String(line);
			}
		}
	}
	// The "n done" pill and a collapse handle: canvas children that are not
	// node lines.
	const pill = canvas.createDiv({ cls: 'mindmap-node mindmap-node-summary' });
	pill.dataset.parentLine = '0';
	canvas.createDiv({ cls: 'mindmap-collapse', text: '+2' });
}

export function drawMap(
	host: HTMLElement,
	path: string | null,
	nodes: readonly NodeSpec[],
): MapFixture {
	const container = host.createDiv({ cls: 'workspace-leaf-content' });
	container.dataset.type = 'mindmap-editor';
	const content = container.createDiv({ cls: 'view-content' });
	const scroller = content.createDiv({ cls: 'mindmap-scroller' });
	const surface = scroller.createDiv({ cls: 'mindmap-surface' });
	const canvas = surface.createDiv({ cls: 'mindmap-canvas' });
	drawNodes(canvas, nodes);
	let file = path;
	const leaf = {
		isDeferred: false,
		view: { getViewType: () => 'mindmap-editor', containerEl: container },
		getViewState: () => ({ type: 'mindmap-editor', state: { file } }),
	} as unknown as WorkspaceLeaf;
	return {
		leaf,
		container,
		canvas,
		redraw: (next) => drawNodes(canvas, next),
		nodeEl(line: number): HTMLElement {
			const el = canvas.querySelector<HTMLElement>(
				`:scope > .mindmap-node[data-line="${line}"]`,
			);
			if (!el) throw new Error(`no node for line ${line}`);
			return el;
		},
		showNote(next: string): void {
			file = next;
		},
	};
}

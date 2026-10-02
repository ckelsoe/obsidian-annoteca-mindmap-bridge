/**
 * @jest-environment jsdom
 * @jest-environment-options {"html": "<html><body><div id=\"seeds\"><div></div><span></span></div></body></html>"}
 */
import type { WorkspaceLeaf } from 'obsidian';
import { installObsidianDomHelpers } from '../__mocks__/obsidian';
import { mindmapEditorAdapter as adapter } from '../adapters/mindmap-editor';
import { at, defined } from './helpers/checked';
import { drawMap } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
afterEach(() => document.body.empty());

describe('Mind map editor adapter', () => {
	it('reads each node line and the body lines drawn inside it', () => {
		const map = drawMap(document.body, 'a.md', [
			{ line: -1, text: 'a', body: [0] },
			{ line: 2, text: 'Plan', body: [5, 6] },
			{ line: 3, text: 'step' },
		]);
		const read = adapter.readNodes(map.canvas);
		if (read.kind !== 'nodes') throw new Error(read.reason);
		expect(read.nodes.map((n) => n.line)).toEqual([-1, 2, 3]);
		expect(at(read.nodes, 1).bodyLines).toEqual([5, 6]);
		expect(at(read.nodes, 1).el).toBe(map.nodeEl(2));
	});

	it('skips the done pill, the edges and the collapse handles', () => {
		const map = drawMap(document.body, 'a.md', [{ line: 1, text: 'x' }]);
		const read = adapter.readNodes(map.canvas);
		if (read.kind !== 'nodes') throw new Error(read.reason);
		expect(read.nodes).toHaveLength(1);
	});

	it('reports a node with no source line as a changed layout', () => {
		const map = drawMap(document.body, 'a.md', [{ line: 1, text: 'x' }]);
		delete map.nodeEl(1).dataset.line;
		expect(adapter.readNodes(map.canvas)).toEqual({
			kind: 'broken',
			reason: 'a map node has no source line',
		});
	});

	it('reads the live canvas, never the snapshot of the last render', () => {
		const map = drawMap(document.body, 'a.md', [{ line: 1, text: 'x' }]);
		// Mind map editor appends the snapshot after the live canvas, as a
		// sibling in the same surface; put one before it as well so document
		// order cannot be what picks the live one.
		const surface = defined(map.canvas.parentElement);
		const before = surface.createDiv({
			cls: 'mindmap-canvas mindmap-render-snapshot',
		});
		surface.insertBefore(before, map.canvas);
		surface.createDiv({ cls: 'mindmap-canvas mindmap-render-snapshot' });
		expect(adapter.canvas(map.leaf)).toBe(map.canvas);
	});

	it('reads the note path from the view state', () => {
		const map = drawMap(document.body, 'notes/a.md', []);
		expect(adapter.notePath(map.leaf)).toBe('notes/a.md');
		map.showNote('');
		expect(adapter.notePath(map.leaf)).toBeNull();
	});

	it('has no canvas for a deferred leaf', () => {
		const map = drawMap(document.body, 'a.md', []);
		const deferred = { ...map.leaf, isDeferred: true } as WorkspaceLeaf;
		expect(adapter.canvas(deferred)).toBeNull();
	});
});

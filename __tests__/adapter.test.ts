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

	it('reads the text the map drew from, with \\n line breaks', () => {
		const map = drawMap(document.body, 'a.md', []);
		map.setSource('# A\r\n- b\r- c');
		expect(adapter.renderedSource(map.leaf)).toBe('# A\n- b\n- c');
		map.setSource(null);
		expect(adapter.renderedSource(map.leaf)).toBeNull();
		const deferred = { ...map.leaf, isDeferred: true } as WorkspaceLeaf;
		expect(adapter.renderedSource(deferred)).toBeNull();
	});

	it('reads which node is selected', () => {
		const map = drawMap(document.body, 'a.md', [
			{ line: -1, text: 'a' },
			{ line: 2, text: 'Plan' },
		]);
		expect(adapter.selectedLine(map.canvas)).toBeNull();
		map.nodeEl(2).addClass('is-selected');
		expect(adapter.selectedLine(map.canvas)).toBe(2);
	});

	it("selects a node through the map's own click and scrolls it into view", () => {
		const map = drawMap(document.body, 'a.md', [{ line: 2, text: 'Plan' }]);
		const el = map.nodeEl(2);
		const scrolled = jest.fn();
		el.scrollIntoView = scrolled;
		// Mind map editor's click listener, which selects the node.
		el.addEventListener('click', () => el.addClass('is-selected'));
		const read = adapter.readNodes(map.canvas);
		if (read.kind !== 'nodes') throw new Error(read.reason);
		expect(adapter.select(at(read.nodes, 0))).toBe(true);
		expect(map.nodeEvents).toEqual(['2:click']);
		expect(scrolled).toHaveBeenCalledWith({
			block: 'center',
			inline: 'center',
		});
	});

	it('reports a click the map did not take', () => {
		const map = drawMap(document.body, 'a.md', [{ line: 2, text: 'Plan' }]);
		map.nodeEl(2).scrollIntoView = jest.fn();
		const read = adapter.readNodes(map.canvas);
		if (read.kind !== 'nodes') throw new Error(read.reason);
		expect(adapter.select(at(read.nodes, 0))).toBe(false);
	});
});

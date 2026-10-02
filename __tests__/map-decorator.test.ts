/**
 * @jest-environment jsdom
 * @jest-environment-options {"pretendToBeVisual": true, "html": "<html><body><div id=\"seeds\"><div></div><span></span><iframe></iframe></div></body></html>"}
 */
import { installObsidianDomHelpers } from '../__mocks__/obsidian';
import type { ApiComment, ApiFilter, AnnotecaApi } from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import type { AnnotecaStatus } from '../annoteca';
import { MapDecorator } from '../map-decorator';
import { commentAt, NOTE } from './fixtures';
import { asyncResult } from './helpers/async-result';
import { defined } from './helpers/checked';
import { drawMap } from './map-dom';
import type { NodeSpec } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
afterEach(() => document.body.empty());

const NODES: NodeSpec[] = [
	{ line: -1, text: 'plan' },
	{ line: 0, text: 'Plan', body: [4] },
	{ line: 1, text: 'review steps' },
	{ line: 2, text: 'automate 6' },
	{ line: 3, text: 'ship it' },
];

interface Harness {
	decorator: MapDecorator;
	queries: ApiFilter[];
	layout: (string | null)[];
	setStatus(next: 'ready' | 'missing'): void;
}

function harness(
	leaf: ReturnType<typeof drawMap>['leaf'],
	comments: (path: string) => readonly ApiComment[],
): Harness {
	const queries: ApiFilter[] = [];
	const layout: (string | null)[] = [];
	const api = {
		apiVersion: 5,
		queryComments: (filter?: ApiFilter) =>
			asyncResult(() => {
				queries.push(defined(filter));
				return comments(defined(filter?.paths?.[0]));
			}),
	} as unknown as AnnotecaApi;
	let status: AnnotecaStatus = { kind: 'ready', api };
	const decorator = new MapDecorator(leaf, {
		adapter: mindmapEditorAdapter,
		annoteca: () => status,
		savedText: () => Promise.resolve(NOTE),
		reportLayout: (problem) => layout.push(problem),
	});
	return {
		decorator,
		queries,
		layout,
		setStatus(next): void {
			status =
				next === 'ready' ? { kind: 'ready', api } : { kind: 'missing' };
		},
	};
}

function badgeOf(el: HTMLElement): HTMLElement | null {
	return el.querySelector<HTMLElement>(':scope > .annoteca-mmb-badge');
}

// The MutationObserver reports in a microtask; the decorator then draws on
// the next animation frame.
async function nextFrame(win: Window = window): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => {
		win.requestAnimationFrame(() => resolve());
	});
}

// Counts observers built from one window's own constructor. A subclass, not
// jest.spyOn: a spied class constructor cannot be called with `new`.
function countObservers(win: Window): { made(): number; restore(): void } {
	const Original = win.MutationObserver;
	let made = 0;
	win.MutationObserver = class extends Original {
		constructor(callback: MutationCallback) {
			super(callback);
			made += 1;
		}
	};
	return {
		made: () => made,
		restore: (): void => {
			win.MutationObserver = Original;
		},
	};
}

// Lets every pending promise chain run to the end.
function settle(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, 0));
}

const clarify = commentAt(NOTE, '<!-- annoteca/clarify', {
	category: 'clarify',
});
const cut = commentAt(NOTE, '<!-- annoteca/cut', {
	category: 'cut',
	resolved: true,
});

describe('MapDecorator', () => {
	it("draws a badge on each node holding a comment, from the note's comments", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify, cut]);
		await h.decorator.refresh();

		expect(h.queries).toEqual([
			{ paths: ['notes/plan.md'], resolved: 'all' },
		]);
		const review = defined(badgeOf(map.nodeEl(1)));
		expect(review.textContent).toBe('1');
		expect(review.hasClass('annoteca-cat-clarify')).toBe(true);
		expect(review.getAttribute('aria-label')).toBe('1 open comment');
		// The resolved comment is body text of the heading: dimmed badge there.
		const plan = defined(badgeOf(map.nodeEl(0)));
		expect(plan.hasClass('is-resolved')).toBe(true);
		expect(plan.textContent).toBe('1');
		expect(badgeOf(map.nodeEl(3))).toBeNull();
		expect(badgeOf(map.nodeEl(-1))).toBeNull();
	});

	it('draws the badges again after the map redraws its nodes', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		const first = map.nodeEl(1);

		map.redraw(NODES);
		expect(map.nodeEl(1)).not.toBe(first);
		expect(badgeOf(map.nodeEl(1))).toBeNull();
		await nextFrame();

		expect(defined(badgeOf(map.nodeEl(1))).textContent).toBe('1');
		// Redrawn from what was loaded, without asking Annoteca again.
		expect(h.queries).toHaveLength(1);
	});

	it("moves a collapsed branch's comments onto the collapsed node", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const tone = commentAt(NOTE, '<!-- annoteca/tone', {
			category: 'tone',
		});
		const h = harness(map.leaf, () => [tone]);
		await h.decorator.refresh();
		expect(defined(badgeOf(map.nodeEl(2))).textContent).toBe('1');

		// Collapse "review steps": its child on line 2 is no longer drawn.
		map.redraw(NODES.filter((n) => n.line !== 2));
		await nextFrame();

		const badge = defined(badgeOf(map.nodeEl(1)));
		expect(badge.textContent).toBe('1');
		expect(badge.hasClass('has-hidden')).toBe(true);
		expect(badge.getAttribute('aria-label')).toBe(
			'1 open comment; 1 in a collapsed branch or hidden text',
		);
	});

	it('leaves an unchanged badge in place instead of rebuilding it', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		const badge = badgeOf(map.nodeEl(1));
		await h.decorator.refresh();
		expect(badgeOf(map.nodeEl(1))).toBe(badge);
	});

	it("loads the other note's comments when the map switches notes", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, (path) =>
			path === 'notes/other.md' ? [cut] : [clarify],
		);
		await h.decorator.refresh();
		expect(badgeOf(map.nodeEl(1))).not.toBeNull();

		map.showNote('notes/other.md');
		map.redraw(NODES);
		await nextFrame();
		// The switch drew nothing from the old note, and asked for the new one.
		expect(badgeOf(map.nodeEl(1))).toBeNull();
		await settle();

		expect(h.queries.map((q) => q.paths)).toEqual([
			['notes/plan.md'],
			['notes/other.md'],
		]);
		expect(badgeOf(map.nodeEl(0))).not.toBeNull();
		expect(badgeOf(map.nodeEl(1))).toBeNull();
	});

	it('draws nothing and asks nothing while Annoteca is unavailable', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		h.setStatus('missing');
		await h.decorator.refresh();
		expect(badgeOf(map.nodeEl(1))).toBeNull();
		expect(h.queries).toHaveLength(1);
	});

	it('keeps the newest result when an older read finishes last', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		let release: (value: readonly ApiComment[]) => void = () => undefined;
		let calls = 0;
		const api = {
			apiVersion: 5,
			queryComments: () => {
				calls += 1;
				// The first read hangs until released; the second answers now.
				if (calls === 1)
					return new Promise<readonly ApiComment[]>((resolve) => {
						release = resolve;
					});
				return Promise.resolve([] as readonly ApiComment[]);
			},
		} as unknown as AnnotecaApi;
		const decorator = new MapDecorator(map.leaf, {
			adapter: mindmapEditorAdapter,
			annoteca: () => ({ kind: 'ready', api }),
			savedText: () => Promise.resolve(NOTE),
			reportLayout: () => undefined,
		});
		const stale = decorator.refresh();
		await decorator.refresh();
		release([clarify]);
		await stale;
		expect(badgeOf(map.nodeEl(1))).toBeNull();
	});

	it('turns badges off and reports it when the map layout is not readable', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		expect(h.layout).toEqual([null]);

		map.redraw(NODES);
		delete map.nodeEl(3).dataset.line;
		await nextFrame();

		expect(h.layout).toEqual([null, 'a map node has no source line']);
		expect(map.canvas.querySelector('.annoteca-mmb-badge')).toBeNull();
	});

	it('removes its badges and stops watching when disposed', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		h.decorator.dispose();
		expect(map.canvas.querySelector('.annoteca-mmb-badge')).toBeNull();

		map.redraw(NODES);
		await nextFrame();
		expect(map.canvas.querySelector('.annoteca-mmb-badge')).toBeNull();
	});

	it("watches a pop-out map with the pop-out window's own observer and frames", async () => {
		const frame = document.body.createEl('iframe');
		const popout = defined(frame.contentWindow);
		installObsidianDomHelpers(popout);
		const map = drawMap(popout.document.body, 'notes/plan.md', NODES);
		expect(map.canvas.win).toBe(popout);
		const popoutObservers = countObservers(popout);
		const mainObservers = countObservers(window);
		const h = harness(map.leaf, () => [clarify]);
		await h.decorator.refresh();
		expect(popoutObservers.made()).toBe(1);
		expect(mainObservers.made()).toBe(0);
		popoutObservers.restore();
		mainObservers.restore();

		const mainFrames = jest.spyOn(window, 'requestAnimationFrame');
		const popoutFrames = jest.spyOn(popout, 'requestAnimationFrame');
		map.redraw(NODES);
		// The observer reports in a microtask and the decorator asks for a
		// frame there, before this test asks for one of its own.
		await Promise.resolve();
		expect(popoutFrames).toHaveBeenCalledTimes(1);
		expect(mainFrames).not.toHaveBeenCalled();
		await nextFrame(popout);
		const badge = defined(badgeOf(map.nodeEl(1)));
		expect(badge.ownerDocument).toBe(popout.document);
		mainFrames.mockRestore();
		popoutFrames.mockRestore();
	});
});

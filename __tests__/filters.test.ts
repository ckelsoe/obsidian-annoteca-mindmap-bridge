/**
 * @jest-environment jsdom
 * @jest-environment-options {"pretendToBeVisual": true, "html": "<html><body><div id=\"seeds\"><div></div><span></span><button></button><iframe></iframe></div></body></html>"}
 */
// Filters, tint, the filter row and go-to, through the decorator that draws
// them on a map.
import { installObsidianDomHelpers } from '../__mocks__/obsidian';
import type { ApiComment, AnnotecaApi } from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import { MapDecorator } from '../map-decorator';
import { defaultSettings } from '../settings';
import type { BridgeSettings } from '../settings';
import { commentAt, NOTE } from './fixtures';
import { asyncResult } from './helpers/async-result';
import { defined } from './helpers/checked';
import { drawMap } from './map-dom';
import type { MapFixture, NodeSpec } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
afterEach(() => document.body.empty());

const NODES: NodeSpec[] = [
	{ line: -1, text: 'plan' },
	{ line: 0, text: 'Plan', body: [4] },
	{ line: 1, text: 'review steps' },
	{ line: 2, text: 'automate 6' },
	{ line: 3, text: 'ship it' },
];

const clarify = commentAt(NOTE, '<!-- annoteca/clarify', {
	category: 'clarify',
});
const tone = commentAt(NOTE, '<!-- annoteca/tone', {
	category: 'tone',
	resolved: true,
});
const cut = commentAt(NOTE, '<!-- annoteca/cut', {
	category: 'cut',
	addressed: true,
});

interface Setup {
	map: MapFixture;
	decorator: MapDecorator;
	prefs: { current: BridgeSettings };
	cleared: number[];
}

async function setup(
	comments: readonly ApiComment[] = [clarify, tone, cut],
	over: Partial<BridgeSettings> = {},
	extra: Partial<{ markup: (map: MapFixture) => void }> = {},
): Promise<Setup> {
	const map = drawMap(document.body, 'notes/plan.md', NODES);
	extra.markup?.(map);
	for (const spec of NODES) map.nodeEl(spec.line).scrollIntoView = jest.fn();
	const prefs = { current: { ...defaultSettings(), ...over } };
	const cleared: number[] = [];
	const api = {
		apiVersion: 7,
		categories: () => [
			{ id: 'clarify', displayName: 'Clarify' },
			{ id: 'tone', displayName: 'Tone' },
			{ id: 'cut', displayName: 'Cut' },
		],
		queryComments: () => asyncResult(() => comments),
	} as unknown as AnnotecaApi;
	const decorator = new MapDecorator(map.leaf, {
		adapter: mindmapEditorAdapter,
		settings: () => prefs.current,
		clearFilter: () => cleared.push(1),
		annoteca: () => ({ kind: 'ready', api }),
		savedText: () => Promise.resolve(NOTE),
		liveText: () => Promise.resolve(NOTE),
		reportLayout: () => undefined,
		storageNoticeDismissed: () => false,
		dismissStorageNotice: () => undefined,
		convertStorage: () => undefined,
	});
	await decorator.refresh();
	return { map, decorator, prefs, cleared };
}

function badgeText(map: MapFixture, line: number): string | null {
	return (
		map.nodeEl(line).querySelector(':scope > .annoteca-mmb-badge')
			?.textContent ?? null
	);
}

function filterRow(map: MapFixture): HTMLElement | null {
	return map.container.querySelector<HTMLElement>(
		':scope > .annoteca-mmb-filter-notice',
	);
}

describe('badge filters', () => {
	it('counts every comment by default', async () => {
		const { map } = await setup();
		expect(badgeText(map, 1)).toBe('1');
		expect(badgeText(map, 2)).toBe('1');
		expect(badgeText(map, 0)).toBe('1');
	});

	it('drops a node whose comments are all filtered out', async () => {
		const { map } = await setup(undefined, { show: 'open' });
		// The tone comment on line 2 is resolved.
		expect(badgeText(map, 2)).toBeNull();
		expect(badgeText(map, 1)).toBe('1');
	});

	it('shows only comments awaiting review', async () => {
		const { map } = await setup(undefined, { show: 'addressed' });
		expect(badgeText(map, 1)).toBeNull();
		expect(badgeText(map, 0)).toBe('1');
	});

	it('leaves hidden categories off the map', async () => {
		const { map } = await setup(undefined, {
			hiddenCategories: ['clarify'],
		});
		expect(badgeText(map, 1)).toBeNull();
		expect(badgeText(map, 2)).toBe('1');
	});

	it('follows a settings change on the next draw', async () => {
		const { map, decorator, prefs } = await setup();
		prefs.current = { ...prefs.current, show: 'open' };
		decorator.draw();
		expect(badgeText(map, 2)).toBeNull();
	});

	it('never filters the "+" control', async () => {
		const { map } = await setup(undefined, { show: 'addressed' });
		expect(
			map.nodeEl(2).querySelector(':scope > .annoteca-mmb-add'),
		).not.toBeNull();
	});
});

describe('filter row', () => {
	it('is not shown while the badges show everything', async () => {
		const { map } = await setup();
		expect(filterRow(map)).toBeNull();
	});

	it('says what is filtered, and clears it from its button', async () => {
		const { map, cleared } = await setup(undefined, {
			show: 'open',
			hiddenCategories: ['tone'],
		});
		const row = defined(filterRow(map));
		expect(row.textContent).toContain(
			'Badges show open comments only, in 2 of 3 categories.',
		);
		defined(row.querySelector('button')).click();
		expect(cleared).toEqual([1]);
	});

	it('goes when the filter is cleared', async () => {
		const { map, decorator, prefs } = await setup(undefined, {
			show: 'open',
		});
		prefs.current = defaultSettings();
		decorator.draw();
		expect(filterRow(map)).toBeNull();
	});

	it('sits after the storage notice, whichever is drawn first', async () => {
		const inline =
			'# Plan\n- review steps <!-- annoteca/clarify: two\nlines -->\n';
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const prefs: { current: BridgeSettings } = {
			current: { ...defaultSettings(), show: 'open' },
		};
		const comment = commentAt(inline, '<!-- annoteca/clarify', {
			marker: {
				start: inline.indexOf('<!--'),
				end: inline.indexOf('-->') + 3,
			},
		});
		const api = {
			apiVersion: 7,
			categories: () => [{ id: 'clarify', displayName: 'Clarify' }],
			queryComments: () => asyncResult(() => [comment]),
		} as unknown as AnnotecaApi;
		const decorator = new MapDecorator(map.leaf, {
			adapter: mindmapEditorAdapter,
			settings: () => prefs.current,
			clearFilter: () => undefined,
			annoteca: () => ({ kind: 'ready', api }),
			savedText: () => Promise.resolve(inline),
			liveText: () => Promise.resolve(inline),
			reportLayout: () => undefined,
			storageNoticeDismissed: () => false,
			dismissStorageNotice: () => undefined,
			convertStorage: () => undefined,
		});
		await decorator.refresh();
		const order = () =>
			Array.from(map.container.children).map((el) =>
				el.hasClass('annoteca-mmb-storage-notice')
					? 'storage'
					: el.hasClass('annoteca-mmb-filter-notice')
						? 'filter'
						: el.className,
			);
		expect(order()).toEqual(['storage', 'filter', 'view-content']);
		// Redraw the filter row alone: it must not jump ahead.
		prefs.current = { ...prefs.current, show: 'addressed' };
		decorator.draw();
		expect(order()).toEqual(['storage', 'filter', 'view-content']);
		decorator.dispose();
		expect(order()).toEqual(['view-content']);
	});
});

describe('tint', () => {
	function tintOf(map: MapFixture, line: number): string | null {
		const el = map
			.nodeEl(line)
			.querySelector<HTMLElement>(':scope > .annoteca-mmb-tint');
		return el?.dataset.annotecaMmbLevel ?? null;
	}

	it('is off by default', async () => {
		const { map } = await setup();
		expect(tintOf(map, 1)).toBeNull();
	});

	it('tints nodes with open comments, and not resolved-only ones', async () => {
		const { map } = await setup(undefined, { tint: true });
		expect(tintOf(map, 1)).toBe('1');
		expect(tintOf(map, 2)).toBeNull();
	});

	it('steps up with the open count', async () => {
		const many = [1, 2, 3, 4].map((n) =>
			commentAt(NOTE, '<!-- annoteca/clarify', {
				id: `m${n}`,
				category: 'clarify',
			}),
		);
		const { map } = await setup(many, { tint: true });
		expect(tintOf(map, 1)).toBe('3');
	});

	it('goes when turned off', async () => {
		const { map, decorator, prefs } = await setup(undefined, {
			tint: true,
		});
		prefs.current = defaultSettings();
		decorator.draw();
		expect(tintOf(map, 1)).toBeNull();
	});
});

describe('go to next/previous node with comments', () => {
	// Mind map editor's own click listener, which selects the node.
	function selectable(map: MapFixture): void {
		for (const spec of NODES) {
			const el = map.nodeEl(spec.line);
			el.addEventListener('click', () => {
				for (const other of NODES)
					map.nodeEl(other.line).removeClass('is-selected');
				el.addClass('is-selected');
			});
		}
	}

	function selected(map: MapFixture): number | null {
		return mindmapEditorAdapter.selectedLine(map.canvas);
	}

	it('walks the badged nodes in line order and wraps', async () => {
		const { map, decorator } = await setup(
			undefined,
			{},
			{ markup: selectable },
		);
		expect(decorator.goTo(1)).toBe(true);
		expect(selected(map)).toBe(0);
		decorator.goTo(1);
		expect(selected(map)).toBe(1);
		decorator.goTo(1);
		expect(selected(map)).toBe(2);
		decorator.goTo(1);
		expect(selected(map)).toBe(0);
		decorator.goTo(-1);
		expect(selected(map)).toBe(2);
	});

	it('skips nodes the filter leaves without a badge', async () => {
		const { map, decorator } = await setup(
			undefined,
			{ show: 'open' },
			{ markup: selectable },
		);
		decorator.goTo(1);
		decorator.goTo(1);
		decorator.goTo(1);
		// Line 2 holds only a resolved comment.
		expect(selected(map)).toBe(0);
	});

	it('marks the node for a moment when the map does not select it', async () => {
		jest.useFakeTimers();
		try {
			const { map, decorator } = await setup();
			decorator.goTo(1);
			expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(true);
			jest.advanceTimersByTime(1300);
			expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(false);
		} finally {
			jest.useRealTimers();
		}
	});

	// The map keeps its old selection, so stepping from it would land on the
	// same node every time.
	it('steps on from where it landed when the map does not select', async () => {
		const { map, decorator } = await setup();
		decorator.goTo(1);
		expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(true);
		decorator.goTo(1);
		expect(map.nodeEl(1).hasClass('annoteca-mmb-flash')).toBe(true);
		decorator.goTo(1);
		expect(map.nodeEl(2).hasClass('annoteca-mmb-flash')).toBe(true);
		decorator.goTo(-1);
		expect(map.nodeEl(1).hasClass('annoteca-mmb-flash')).toBe(true);
	});

	it("starts from the user's own selection once it changes", async () => {
		const { map, decorator } = await setup();
		decorator.goTo(1);
		decorator.goTo(1);
		// The user selects line 2 on the map.
		map.nodeEl(2).addClass('is-selected');
		decorator.goTo(1);
		expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(true);
	});

	it('forgets where it landed when the map shows another note', async () => {
		const { map, decorator } = await setup();
		decorator.goTo(1);
		decorator.goTo(1);
		map.showNote('notes/other.md');
		await decorator.refresh();
		decorator.goTo(1);
		// The first badged node again, not the one after line 1.
		expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(true);
	});

	it('does not revive a landing after switching away and back', async () => {
		const { map, decorator } = await setup();
		decorator.goTo(1);
		decorator.goTo(1);
		map.showNote('notes/other.md');
		await decorator.refresh();
		map.showNote('notes/plan.md');
		await decorator.refresh();
		decorator.goTo(1);
		expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(true);
	});

	it('clears a pending mark when disposed', async () => {
		const { map, decorator } = await setup();
		decorator.goTo(1);
		decorator.dispose();
		expect(map.nodeEl(0).hasClass('annoteca-mmb-flash')).toBe(false);
	});

	it('answers false when no node has a badge', async () => {
		const { decorator } = await setup([]);
		expect(decorator.goTo(1)).toBe(false);
	});
});

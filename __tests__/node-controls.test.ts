/**
 * @jest-environment jsdom
 * @jest-environment-options {"pretendToBeVisual": true, "html": "<html><body><div id=\"seeds\"><div></div><span></span><iframe></iframe></div></body></html>"}
 */
// The node controls, driven the way a user drives them: real DOM clicks on
// the badge, the menu and the "+" button, through the decorator that drew
// them, not calls into the action functions.
import {
	installObsidianDomHelpers,
	menuLog,
	noticeLog,
} from '../__mocks__/obsidian';
import type { ApiComment, AnnotecaApi, ComposeRange } from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import { MapDecorator } from '../map-decorator';
import { snippet } from '../node-actions';
import { commentAt, NOTE } from './fixtures';
import { asyncResult } from './helpers/async-result';
import { at, defined } from './helpers/checked';
import { drawMap } from './map-dom';
import type { MapFixture, NodeSpec } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
beforeEach(() => {
	menuLog.length = 0;
	noticeLog.length = 0;
});
afterEach(() => document.body.empty());

const NODES: NodeSpec[] = [
	{ line: -1, text: 'plan' },
	{ line: 0, text: 'Plan', body: [4] },
	{ line: 1, text: 'review steps' },
	{ line: 2, text: 'automate 6' },
	{ line: 3, text: 'ship it' },
];

interface Calls {
	revealed: string[];
	composed: { path: string; range: ComposeRange }[];
}

function setup(
	map: MapFixture,
	comments: () => readonly ApiComment[],
	options: {
		reveal?: (id: string) => Promise<boolean>;
		compose?: () => Promise<boolean>;
		text?: string;
	} = {},
): { decorator: MapDecorator; calls: Calls } {
	const calls: Calls = { revealed: [], composed: [] };
	const api = {
		apiVersion: 5,
		categories: () => [
			{ id: 'clarify', displayName: 'Clarify' },
			{ id: 'tone', displayName: 'Tone' },
		],
		queryComments: () => asyncResult(comments),
		reveal: (id: string) => {
			calls.revealed.push(id);
			return options.reveal ? options.reveal(id) : Promise.resolve(true);
		},
		compose: (path: string, range: ComposeRange) => {
			calls.composed.push({ path, range });
			return options.compose ? options.compose() : Promise.resolve(true);
		},
	} as unknown as AnnotecaApi;
	const decorator = new MapDecorator(map.leaf, {
		adapter: mindmapEditorAdapter,
		annoteca: () => ({ kind: 'ready', api }),
		savedText: () => Promise.resolve(NOTE),
		liveText: () => Promise.resolve(options.text ?? NOTE),
		reportLayout: () => undefined,
	});
	return { decorator, calls };
}

function control(map: MapFixture, line: number, cls: string): HTMLElement {
	return defined(
		map.nodeEl(line).querySelector<HTMLElement>(`:scope > .${cls}`),
	);
}

// What a pointer does on a button: the press, then the click. jsdom has no
// PointerEvent; listeners only see the type, so a MouseEvent of that type
// reaches the same handlers.
function press(el: HTMLElement): void {
	el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
	el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
	el.click();
}

function settle(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, 0));
}

const clarify = commentAt(NOTE, '<!-- annoteca/clarify', {
	id: 'c1',
	category: 'clarify',
	body: 'Which steps exactly, and in what order should they run on release day?',
});
const tone = commentAt(NOTE, '<!-- annoteca/tone', {
	id: 't1',
	category: 'tone',
	body: 'Too terse.',
	resolved: true,
});

describe('badge', () => {
	it('opens a lone comment in Annoteca', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator, calls } = setup(map, () => [clarify]);
		await decorator.refresh();

		press(control(map, 1, 'annoteca-mmb-badge'));
		await settle();

		expect(calls.revealed).toEqual(['c1']);
		expect(menuLog).toHaveLength(0);
	});

	it('lists several comments in a menu, each opening its own', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		// Collapse "review steps": the resolved tone comment on its child
		// line falls to it.
		map.redraw(NODES.filter((n) => n.line !== 2));
		const { decorator, calls } = setup(map, () => [clarify, tone]);
		await decorator.refresh();

		press(control(map, 1, 'annoteca-mmb-badge'));
		await settle();

		const menu = at(menuLog, 0);
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)}`,
			'Tone: Too terse. (resolved, hidden on the map)',
		]);
		defined(at(menu.items, 1).click)();
		await settle();
		expect(calls.revealed).toEqual(['t1']);
	});

	it('opens the comments the note has now, not the ones it had when drawn', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		let current: readonly ApiComment[] = [clarify];
		const { decorator, calls } = setup(map, () => current);
		await decorator.refresh();
		const badge = control(map, 1, 'annoteca-mmb-badge');

		// Same count and category, so the badge is left in place, but it is a
		// different comment now.
		current = [{ ...clarify, id: 'c2' }];
		await decorator.refresh();
		expect(control(map, 1, 'annoteca-mmb-badge')).toBe(badge);
		press(badge);
		await settle();

		expect(calls.revealed).toEqual(['c2']);
	});

	it('says so when the comment is gone from the note', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => [clarify], {
			reveal: () => Promise.resolve(false),
		});
		await decorator.refresh();
		press(control(map, 1, 'annoteca-mmb-badge'));
		await settle();
		expect(noticeLog).toEqual(['That comment is no longer in the note.']);
	});

	it("never reaches the node's own select, drag, edit or menu handlers", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => [clarify]);
		await decorator.refresh();
		const badge = control(map, 1, 'annoteca-mmb-badge');
		press(badge);
		badge.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		badge.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
		press(control(map, 1, 'annoteca-mmb-add'));
		await settle();
		expect(map.nodeEvents).toEqual([]);
	});
});

describe('keyboard', () => {
	it('opens with Enter and comments with Space, keeping the keys from the map', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator, calls } = setup(map, () => [clarify]);
		await decorator.refresh();
		const badge = control(map, 1, 'annoteca-mmb-badge');
		const add = control(map, 3, 'annoteca-mmb-add');
		expect(badge.getAttribute('role')).toBe('button');
		expect(badge.tabIndex).toBe(0);

		badge.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
		);
		add.dispatchEvent(
			new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
		);
		// Any other key is the map's.
		add.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
		);
		await settle();

		expect(calls.revealed).toEqual(['c1']);
		expect(calls.composed).toHaveLength(1);
		expect(map.nodeEvents).toEqual(['3:keydown']);
	});
});

describe('"+" button', () => {
	it("asks Annoteca to comment on the node's own text", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator, calls } = setup(map, () => []);
		await decorator.refresh();

		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();

		const start = NOTE.indexOf('ship it');
		expect(calls.composed).toEqual([
			{ path: 'notes/plan.md', range: { start, end: start + 7 } },
		]);
	});

	it('uses the live editor text, which can be ahead of the saved note', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const live = NOTE.replace('- ship it', '- ship it on Friday');
		const { decorator, calls } = setup(map, () => [], { text: live });
		await decorator.refresh();

		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();

		const range = defined(calls.composed[0]).range;
		expect(live.slice(range.start, range.end)).toBe('ship it on Friday');
	});

	it('has no button on the root, which stands for the whole note', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => []);
		await decorator.refresh();
		expect(
			map.nodeEl(-1).querySelector(':scope > .annoteca-mmb-add'),
		).toBeNull();
		expect(
			map.nodeEl(0).querySelector(':scope > .annoteca-mmb-add'),
		).not.toBeNull();
	});

	it('opens one form however often it is pressed while Annoteca opens it', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		let finish: (ok: boolean) => void = () => undefined;
		const { decorator, calls } = setup(map, () => [], {
			compose: () =>
				new Promise<boolean>((resolve) => {
					finish = resolve;
				}),
		});
		await decorator.refresh();
		const add = control(map, 3, 'annoteca-mmb-add');

		press(add);
		press(add);
		await settle();
		expect(calls.composed).toHaveLength(1);

		finish(true);
		await settle();
		press(add);
		await settle();
		expect(calls.composed).toHaveLength(2);
	});

	it('says so when Annoteca will not start the comment', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => [], {
			compose: () => Promise.resolve(false),
		});
		await decorator.refresh();
		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();
		expect(noticeLog).toEqual([
			'Annoteca could not start a comment on this node. Its text may overlap another comment.',
		]);
	});

	it('says so when the node has no text to cover', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const blank = NOTE.replace('- ship it', '- ');
		const { decorator, calls } = setup(map, () => [], { text: blank });
		await decorator.refresh();
		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();
		expect(calls.composed).toEqual([]);
		expect(noticeLog).toEqual(['This node has no text to comment on.']);
	});
});

describe('in a pop-out window', () => {
	it('shows the comment menu in the pop-out', async () => {
		const frame = document.body.createEl('iframe');
		const popout = defined(frame.contentWindow);
		installObsidianDomHelpers(popout);
		const map = drawMap(popout.document.body, 'notes/plan.md', NODES);
		map.redraw(NODES.filter((n) => n.line !== 2));
		const { decorator } = setup(map, () => [clarify, tone]);
		await decorator.refresh();

		press(control(map, 1, 'annoteca-mmb-badge'));
		await settle();

		expect(at(menuLog, 0).shownIn).toBe(popout.document);
	});
});

describe('snippet', () => {
	it('keeps a short body whole, on one line, and shortens a long one', () => {
		expect(snippet('Too terse.')).toBe('Too terse.');
		expect(snippet('line one\n\nline   two')).toBe('line one line two');
		const cut = snippet(clarify.body);
		expect(cut.endsWith('...')).toBe(true);
		expect(cut.length).toBeLessThanOrEqual(51);
	});
});

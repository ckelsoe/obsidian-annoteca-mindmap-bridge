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
import type { Menu } from '../__mocks__/obsidian';
import type {
	ApiComment,
	ApiWriteResult,
	AnnotecaApi,
	ComposeRange,
} from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import { defaultSettings } from '../settings';
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
	changed: string[];
}

function setup(
	map: MapFixture,
	comments: () => readonly ApiComment[],
	options: {
		reveal?: (id: string) => Promise<boolean>;
		compose?: () => Promise<boolean>;
		// The note's live text, NOTE unless given.
		text?: string;
		// An open editor on the note; change `text` to type in it.
		editor?: { text: string };
		// The text the map drew from; the live text unless given.
		drawnFrom?: string | null;
		// An Annoteca with resolve() and reopen() (API version 7), answering
		// with this.
		resolves?: ApiWriteResult;
	} = {},
): { decorator: MapDecorator; calls: Calls } {
	const calls: Calls = { revealed: [], composed: [], changed: [] };
	const api = {
		apiVersion: options.resolves === undefined ? 5 : 7,
		...(options.resolves === undefined
			? {}
			: {
					resolve: (id: string) => {
						calls.changed.push(`resolve:${id}`);
						return Promise.resolve(options.resolves);
					},
					reopen: (id: string) => {
						calls.changed.push(`reopen:${id}`);
						return Promise.resolve(options.resolves);
					},
				}),
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
	map.setSource(
		options.drawnFrom === undefined
			? (options.editor?.text ?? options.text ?? NOTE)
			: options.drawnFrom,
	);
	const decorator = new MapDecorator(map.leaf, {
		adapter: mindmapEditorAdapter,
		settings: () => defaultSettings(),
		clearFilter: () => undefined,
		annoteca: () => ({ kind: 'ready', api }),
		savedText: () => Promise.resolve(NOTE),
		liveText: () =>
			Promise.resolve(options.editor?.text ?? options.text ?? NOTE),
		reportLayout: () => undefined,
		storageNoticeDismissed: () => false,
		dismissStorageNotice: () => undefined,
		convertStorage: () => undefined,
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

// The map's redraw reaches the bridge in a microtask, and it draws on the
// next frame.
async function nextFrame(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => {
		window.requestAnimationFrame(() => resolve());
	});
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

// Press a node's badge and wait for its menu.
async function openBadge(map: MapFixture, line: number): Promise<Menu> {
	press(control(map, line, 'annoteca-mmb-badge'));
	await settle();
	return at(menuLog, menuLog.length - 1);
}

async function choose(menu: Menu, title: string): Promise<void> {
	const item = menu.items.find((i) => i.title === title);
	defined(defined(item).click)();
	await settle();
}

describe('badge', () => {
	it('opens a menu even for one comment, and the comment from it', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator, calls } = setup(map, () => [clarify]);
		await decorator.refresh();

		const menu = await openBadge(map, 1);
		// Annoteca below API version 7: Open only, no Resolve.
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)}`,
		]);
		expect(calls.revealed).toEqual([]);
		await choose(menu, `Clarify: ${snippet(clarify.body)}`);
		expect(calls.revealed).toEqual(['c1']);
	});

	it('lists several comments in a menu, each opening its own', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		// Collapse "review steps": the resolved tone comment on its child
		// line falls to it.
		map.redraw(NODES.filter((n) => n.line !== 2));
		const { decorator, calls } = setup(map, () => [clarify, tone]);
		await decorator.refresh();

		const menu = await openBadge(map, 1);
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)}`,
			'---',
			'Tone: Too terse. (resolved, hidden on the map)',
		]);
		await choose(menu, 'Tone: Too terse. (resolved, hidden on the map)');
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
		const menu = await openBadge(map, 1);
		await choose(menu, `Clarify: ${snippet(clarify.body)}`);

		expect(calls.revealed).toEqual(['c2']);
	});

	it('says so when the comment is gone from the note', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => [clarify], {
			reveal: () => Promise.resolve(false),
		});
		await decorator.refresh();
		const menu = await openBadge(map, 1);
		await choose(menu, `Clarify: ${snippet(clarify.body)}`);
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

describe('resolve and reopen from the badge menu', () => {
	it('offers Resolve on an open comment and Reopen on a resolved one', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		map.redraw(NODES.filter((n) => n.line !== 2));
		const { decorator, calls } = setup(map, () => [clarify, tone], {
			resolves: 'done',
		});
		await decorator.refresh();

		const menu = await openBadge(map, 1);
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)}`,
			'Resolve',
			'---',
			'Tone: Too terse. (resolved, hidden on the map)',
			'Reopen',
		]);
		await choose(menu, 'Resolve');
		await choose(menu, 'Reopen');
		expect(calls.changed).toEqual(['resolve:c1', 'reopen:t1']);
		// Annoteca narrates done itself; the bridge adds nothing.
		expect(noticeLog).toEqual([]);
	});

	it('sends a proposed edit to Annoteca for review instead of resolving it', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const addressed = { ...clarify, addressed: true };
		const { decorator, calls } = setup(map, () => [addressed], {
			resolves: 'done',
		});
		await decorator.refresh();

		const menu = await openBadge(map, 1);
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)} (edit awaiting review)`,
			'Review the proposed edit',
		]);
		await choose(menu, 'Review the proposed edit');
		expect(calls.revealed).toEqual(['c1']);
		expect(calls.changed).toEqual([]);
	});

	it.each([
		['not-found', 'That comment is no longer in the note.'],
		[
			'addressed',
			'This comment has a proposed edit waiting. Open it to accept, revise or reject the edit.',
		],
	] as const)('reports %s', async (answer, notice) => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(map, () => [clarify], { resolves: answer });
		await decorator.refresh();
		await choose(await openBadge(map, 1), 'Resolve');
		expect(noticeLog).toEqual([notice]);
	});

	it('offers no Resolve on a comment without an id', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator } = setup(
			map,
			() => [{ ...clarify, id: undefined }],
			{
				resolves: 'done',
			},
		);
		await decorator.refresh();
		const menu = await openBadge(map, 1);
		expect(menu.items.map((i) => i.title)).toEqual([
			`Clarify: ${snippet(clarify.body)}`,
		]);
		expect(at(menu.items, 0).disabled).toBe(true);
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

		expect(menuLog).toHaveLength(1);
		expect(calls.composed).toHaveLength(1);
		expect(map.nodeEvents).toEqual(['3:keydown']);
	});
});

describe('keyboard focus', () => {
	it('stays on the badge when its count changes', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		let current: readonly ApiComment[] = [clarify];
		const { decorator } = setup(map, () => current);
		await decorator.refresh();
		const before = control(map, 1, 'annoteca-mmb-badge');
		before.focus();

		current = [clarify, { ...clarify, id: 'c3' }];
		await decorator.refresh();

		const after = control(map, 1, 'annoteca-mmb-badge');
		expect(after).not.toBe(before);
		expect(after.textContent).toBe('2');
		expect(document.activeElement).toBe(after);
	});

	it("moves to the node's + when its badge goes away", async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		let current: readonly ApiComment[] = [clarify];
		const { decorator } = setup(map, () => current);
		await decorator.refresh();
		control(map, 1, 'annoteca-mmb-badge').focus();

		current = [];
		await decorator.refresh();

		expect(
			map.nodeEl(1).querySelector(':scope > .annoteca-mmb-badge'),
		).toBeNull();
		expect(document.activeElement).toBe(
			control(map, 1, 'annoteca-mmb-add'),
		);
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

	it('waits for the map when an edit has shifted the lines under it', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const editor = { text: NOTE };
		const { decorator, calls } = setup(map, () => [], { editor });
		await decorator.refresh();

		// A line typed above, not yet redrawn: line 3 is now "automate 6".
		editor.text = NOTE.replace('# Plan', '# Plan\nnew line');
		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();

		expect(calls.composed).toEqual([]);
		expect(noticeLog).toEqual([
			'The map has not caught up with your latest edits. Try again in a moment.',
		]);
	});

	it('waits for the map when the node was deleted', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const editor = { text: NOTE };
		const { decorator, calls } = setup(map, () => [], { editor });
		await decorator.refresh();

		// "review steps" (line 1) deleted; "automate 6" moved up into line 1.
		editor.text = NOTE.split('\n')
			.filter((_, i) => i !== 1)
			.join('\n');
		press(control(map, 1, 'annoteca-mmb-add'));
		await settle();

		expect(calls.composed).toEqual([]);
	});

	it('comments once the map has redrawn with the edit', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const editor = { text: NOTE };
		const { decorator, calls } = setup(map, () => [], { editor });
		await decorator.refresh();

		editor.text = NOTE.replace('# Plan', '# Plan\nnew line');
		map.redraw(
			NODES.map((n) => (n.line > 0 ? { ...n, line: n.line + 1 } : n)),
		);
		map.setSource(editor.text);
		await nextFrame();
		press(control(map, 4, 'annoteca-mmb-add'));
		await settle();

		const range = defined(calls.composed[0]).range;
		expect(editor.text.slice(range.start, range.end)).toBe('ship it');
	});

	it('does not wait for an edit on another line', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const editor = { text: NOTE };
		const { decorator, calls } = setup(map, () => [], { editor });
		await decorator.refresh();

		editor.text = NOTE.replace('Closing words', 'Closing remarks');
		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();

		expect(calls.composed).toHaveLength(1);
	});

	it('refuses when it cannot tell which text the map drew', async () => {
		const map = drawMap(document.body, 'notes/plan.md', NODES);
		const { decorator, calls } = setup(map, () => [], { drawnFrom: null });
		await decorator.refresh();
		press(control(map, 3, 'annoteca-mmb-add'));
		await settle();
		expect(calls.composed).toEqual([]);
		expect(noticeLog).toEqual([
			'Could not tell which text this node shows. Comment on it from the note instead.',
		]);
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
		// The map has caught up: it shows the item with no label.
		map.redraw(NODES.map((n) => (n.line === 3 ? { ...n, text: '' } : n)));
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

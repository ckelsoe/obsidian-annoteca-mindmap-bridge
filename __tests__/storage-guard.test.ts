/**
 * @jest-environment jsdom
 * @jest-environment-options {"pretendToBeVisual": true, "html": "<html><body><div id=\"seeds\"><div></div><span></span><button></button></div></body></html>"}
 */
import type { App, WorkspaceLeaf } from 'obsidian';
import { installObsidianDomHelpers, noticeLog } from '../__mocks__/obsidian';
import type { AnnotecaApi } from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import { MapDecorator } from '../map-decorator';
import { convertToEndOfFile, multiLineMarkers } from '../storage-guard';
import { commentAt, INLINE, inlineComment, NOTE } from './fixtures';
import { asyncResult } from './helpers/async-result';
import { defined } from './helpers/checked';
import { drawMap } from './map-dom';
import type { MapFixture } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
beforeEach(() => {
	noticeLog.length = 0;
});
afterEach(() => document.body.empty());

const leanComment = commentAt(NOTE, '<!-- annoteca/clarify: [id=a] -->', {
	id: 'a',
});

describe('multiLineMarkers', () => {
	it('counts the markers that span lines, not the one-line ones', () => {
		expect(multiLineMarkers(INLINE, [inlineComment])).toBe(1);
		expect(multiLineMarkers(NOTE, [leanComment])).toBe(0);
	});
});

interface Notice {
	map: MapFixture;
	decorator: MapDecorator;
	converted: string[];
	dismissed: Set<string>;
}

async function showNote(
	text: string,
	comments = [inlineComment],
): Promise<Notice> {
	const map = drawMap(document.body, 'notes/plan.md', [
		{ line: -1, text: 'plan' },
		{ line: 0, text: 'Plan' },
	]);
	const converted: string[] = [];
	const dismissed = new Set<string>();
	const api = {
		apiVersion: 5,
		queryComments: () => asyncResult(() => comments),
	} as unknown as AnnotecaApi;
	const decorator: MapDecorator = new MapDecorator(map.leaf, {
		adapter: mindmapEditorAdapter,
		annoteca: () => ({ kind: 'ready', api }),
		savedText: () => Promise.resolve(text),
		liveText: () => Promise.resolve(text),
		reportLayout: () => undefined,
		storageNoticeDismissed: (path) => dismissed.has(path),
		dismissStorageNotice: (path) => {
			dismissed.add(path);
			decorator.draw();
		},
		convertStorage: (path) => converted.push(path),
	});
	await decorator.refresh();
	return { map, decorator, converted, dismissed };
}

function noticeOf(map: MapFixture): HTMLElement | null {
	return map.container.querySelector<HTMLElement>(
		':scope > .annoteca-mmb-storage-notice',
	);
}

function button(map: MapFixture, text: string): HTMLElement {
	const found = Array.from(
		defined(noticeOf(map)).querySelectorAll<HTMLElement>('button'),
	).find((b) => b.textContent === text);
	return defined(found);
}

describe('storage notice', () => {
	it('shows above the map when the note has multi-line markers', async () => {
		const { map } = await showNote(INLINE);
		const notice = defined(noticeOf(map));
		// Its own row, before the view content, not inside the map.
		expect(notice.nextElementSibling?.hasClass('view-content')).toBe(true);
		expect(
			map.canvas.querySelector('.annoteca-mmb-storage-notice'),
		).toBeNull();
		expect(notice.textContent).toContain(
			"One of this note's Annoteca comments is stored across several lines.",
		);
	});

	it('does not show when every marker is on one line', async () => {
		const { map } = await showNote(NOTE, [leanComment]);
		expect(noticeOf(map)).toBeNull();
	});

	it('runs the conversion only when the button is pressed', async () => {
		const { map, converted } = await showNote(INLINE);
		expect(converted).toEqual([]);
		button(map, 'Convert to end-of-file storage').click();
		expect(converted).toEqual(['notes/plan.md']);
	});

	it('goes away for the session on "Not now"', async () => {
		const { map, decorator } = await showNote(INLINE);
		button(map, 'Not now').click();
		expect(noticeOf(map)).toBeNull();
		await decorator.refresh();
		expect(noticeOf(map)).toBeNull();
	});

	it('is drawn once however often the map redraws', async () => {
		const { map, decorator } = await showNote(INLINE);
		const first = noticeOf(map);
		decorator.draw();
		await decorator.refresh();
		expect(
			map.container.querySelectorAll('.annoteca-mmb-storage-notice'),
		).toHaveLength(1);
		expect(noticeOf(map)).toBe(first);
	});

	it('is removed with the decorator', async () => {
		const { map, decorator } = await showNote(INLINE);
		decorator.dispose();
		expect(noticeOf(map)).toBeNull();
	});
});

describe('convertToEndOfFile', () => {
	interface Workspace {
		app: App;
		ran: string[];
		activated: WorkspaceLeaf[];
		opened: WorkspaceLeaf[];
	}

	function workspace(
		markdownFiles: readonly string[],
		commandRuns = true,
	): Workspace {
		const ran: string[] = [];
		const activated: WorkspaceLeaf[] = [];
		const opened: WorkspaceLeaf[] = [];
		const leafFor = (file: string): WorkspaceLeaf =>
			({
				getViewState: () => ({ type: 'markdown', state: { file } }),
			}) as unknown as WorkspaceLeaf;
		const fresh = {
			getViewState: () => ({ type: 'empty', state: {} }),
			openFile: () => {
				opened.push(fresh);
				return Promise.resolve();
			},
		} as unknown as WorkspaceLeaf;
		const app = {
			vault: { getFileByPath: (p: string) => ({ path: p }) },
			workspace: {
				getLeavesOfType: () => markdownFiles.map(leafFor),
				getLeaf: () => fresh,
				revealLeaf: () => Promise.resolve(),
				setActiveLeaf: (leaf: WorkspaceLeaf) => activated.push(leaf),
			},
			commands: {
				executeCommandById: (id: string) => {
					ran.push(id);
					return commandRuns;
				},
			},
		} as unknown as App;
		return { app, ran, activated, opened };
	}

	it("activates the note's open editor and runs Annoteca's command there", async () => {
		const w = workspace(['other.md', 'notes/plan.md']);
		expect(await convertToEndOfFile(w.app, 'notes/plan.md')).toBe(true);
		expect(w.opened).toEqual([]);
		expect(defined(w.activated[0]).getViewState().state?.file).toBe(
			'notes/plan.md',
		);
		expect(w.ran).toEqual(['annoteca:convert-note-to-eof-storage']);
	});

	it('opens the note first when no editor shows it', async () => {
		const w = workspace(['other.md']);
		await convertToEndOfFile(w.app, 'notes/plan.md');
		expect(w.opened).toHaveLength(1);
		expect(w.activated).toEqual(w.opened);
		expect(w.ran).toEqual(['annoteca:convert-note-to-eof-storage']);
	});

	it('says how to do it by hand when the command does not run', async () => {
		const w = workspace(['notes/plan.md'], false);
		expect(await convertToEndOfFile(w.app, 'notes/plan.md')).toBe(false);
		expect(noticeLog).toEqual([
			'Could not run the conversion. Open the note, then convert it to end-of-file comment storage from the command palette.',
		]);
	});
});

describe('a failing notice', () => {
	it('still lets the badges draw', async () => {
		const errors = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const map = drawMap(document.body, 'notes/plan.md', [
			{ line: 0, text: 'Plan' },
			{ line: 1, text: 'review steps' },
		]);
		const api = {
			apiVersion: 5,
			queryComments: () => asyncResult(() => [inlineComment]),
		} as unknown as AnnotecaApi;
		const decorator = new MapDecorator(map.leaf, {
			adapter: mindmapEditorAdapter,
			annoteca: () => ({ kind: 'ready', api }),
			savedText: () => Promise.resolve(INLINE),
			liveText: () => Promise.resolve(INLINE),
			reportLayout: () => undefined,
			storageNoticeDismissed: () => {
				throw new Error('notice store broke');
			},
			dismissStorageNotice: () => undefined,
			convertStorage: () => undefined,
		});
		await decorator.refresh();
		expect(
			map.nodeEl(1).querySelector(':scope > .annoteca-mmb-badge'),
		).not.toBeNull();
		expect(errors).toHaveBeenCalled();
		errors.mockRestore();
	});
});

describe('after the note is converted', () => {
	it('takes the notice down once every marker is on one line', async () => {
		const map = drawMap(document.body, 'notes/plan.md', [
			{ line: 0, text: 'Plan' },
		]);
		let text = INLINE;
		let comments = [inlineComment];
		const api = {
			apiVersion: 5,
			queryComments: () => asyncResult(() => comments),
		} as unknown as AnnotecaApi;
		const decorator = new MapDecorator(map.leaf, {
			adapter: mindmapEditorAdapter,
			annoteca: () => ({ kind: 'ready', api }),
			savedText: () => Promise.resolve(text),
			liveText: () => Promise.resolve(text),
			reportLayout: () => undefined,
			storageNoticeDismissed: () => false,
			dismissStorageNotice: () => undefined,
			convertStorage: () => undefined,
		});
		await decorator.refresh();
		expect(noticeOf(map)).not.toBeNull();

		// What Annoteca's conversion leaves: lean one-line markers.
		text = NOTE;
		comments = [leanComment];
		await decorator.refresh();
		expect(noticeOf(map)).toBeNull();
	});
});

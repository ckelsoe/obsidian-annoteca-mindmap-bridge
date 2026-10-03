/**
 * @jest-environment jsdom
 * @jest-environment-options {"pretendToBeVisual": true, "html": "<html><body><div id=\"seeds\"><div></div><span></span><button></button></div></body></html>"}
 */
import type { Plugin, WorkspaceLeaf } from 'obsidian';
import {
	debounceStats,
	installObsidianDomHelpers,
	noticeLog,
} from '../__mocks__/obsidian';
import type { ApiComment, AnnotecaApi } from '../annoteca-api';
import { mindmapEditorAdapter } from '../adapters/mindmap-editor';
import { BridgeService } from '../bridge-service';
import { INLINE, inlineComment, NOTE } from './fixtures';
import { defined } from './helpers/checked';
import { drawMap } from './map-dom';

beforeAll(() => installObsidianDomHelpers());
beforeEach(() => {
	debounceStats.calls = 0;
	debounceStats.runs = 0;
	noticeLog.length = 0;
});
afterEach(() => document.body.empty());

interface World {
	plugin: Plugin;
	leaves: WorkspaceLeaf[];
	setAnnoteca(api: unknown): void;
	subscriptions(): number;
	unsubscribed(): number;
}

function world(
	text: string = NOTE,
	comments: readonly ApiComment[] = [],
): World & { readonly api: AnnotecaApi } {
	let annoteca: { api?: unknown } | null = null;
	const leaves: WorkspaceLeaf[] = [];
	let subscribed = 0;
	let unsubscribed = 0;
	const app = {
		plugins: {
			getPlugin: (id: string) => (id === 'annoteca' ? annoteca : null),
		},
		workspace: {
			on: () => ({}),
			onLayoutReady: (cb: () => void) => cb(),
			getLeavesOfType: (type: string) =>
				type === 'mindmap-editor' ? [...leaves] : [],
		},
		vault: {
			on: () => ({}),
			getFileByPath: () => ({}),
			cachedRead: () => Promise.resolve(text),
		},
	};
	const plugin = { app, registerEvent: () => undefined } as unknown as Plugin;
	return {
		plugin,
		leaves,
		setAnnoteca(api: unknown): void {
			annoteca = { api };
		},
		subscriptions: () => subscribed,
		unsubscribed: () => unsubscribed,
		// A fresh API object on every read, as after Annoteca reloads. Each
		// counts its subscriptions into this world.
		get api(): AnnotecaApi {
			return {
				apiVersion: 5,
				categories: () => [],
				queryComments: () => Promise.resolve(comments),
				reveal: () => Promise.resolve(true),
				compose: () => Promise.resolve(true),
				onChange: () => {
					subscribed += 1;
					return () => {
						unsubscribed += 1;
					};
				},
			} as unknown as AnnotecaApi;
		},
	};
}

describe('BridgeService', () => {
	it('keeps one decorator per open map and drops closed ones', () => {
		const w = world();
		const first = drawMap(document.body, 'a.md', []).leaf;
		const second = drawMap(document.body, 'b.md', []).leaf;
		w.leaves.push(first, second);
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		expect(bridge.mapCount()).toBe(2);

		w.leaves.splice(0, 1);
		bridge.sync();
		expect(bridge.mapCount()).toBe(1);
		bridge.stop();
		expect(bridge.mapCount()).toBe(0);
	});

	it('does not reload every map on each sync while Annoteca is absent', () => {
		const w = world();
		w.leaves.push(drawMap(document.body, 'a.md', []).leaf);
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		bridge.sync();
		bridge.sync();
		expect(debounceStats.calls).toBe(0);
		bridge.stop();
	});

	it('subscribes to Annoteca once, and again only when it changes', () => {
		const w = world();
		const api = w.api;
		w.setAnnoteca(api);
		w.leaves.push(drawMap(document.body, 'a.md', []).leaf);
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		bridge.sync();
		bridge.sync();
		expect(w.subscriptions()).toBe(1);

		// Annoteca reloaded: a new API object.
		w.setAnnoteca(w.api);
		bridge.sync();
		expect(w.subscriptions()).toBe(2);
		expect(w.unsubscribed()).toBe(1);

		bridge.stop();
		expect(w.unsubscribed()).toBe(2);
	});

	it('says once a session that Annoteca is missing, when a map is open', () => {
		const w = world();
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		expect(noticeLog).toEqual([]);

		w.leaves.push(drawMap(document.body, 'a.md', []).leaf);
		bridge.sync();
		bridge.sync();
		expect(noticeLog).toEqual([
			'Annoteca MindMap Bridge needs the Annoteca plugin, installed and enabled, to show comments on mind maps.',
		]);
		bridge.stop();
	});

	it('asks for a newer Annoteca when its API is below version 5', () => {
		const w = world();
		w.setAnnoteca({ ...w.api, apiVersion: 4 });
		w.leaves.push(drawMap(document.body, 'a.md', []).leaf);
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		expect(bridge.annoteca().kind).toBe('outdated');
		expect(noticeLog).toEqual([
			'Annoteca MindMap Bridge needs Annoteca 1.20.0 or later. Update Annoteca to show comments on mind maps.',
		]);
		bridge.stop();
	});

	it('sets the storage notice aside on every map of that note at once', async () => {
		const w = world(INLINE, [inlineComment]);
		w.setAnnoteca(w.api);
		const first = drawMap(document.body, 'notes/plan.md', []);
		const second = drawMap(document.body, 'notes/plan.md', []);
		w.leaves.push(first.leaf, second.leaf);
		const bridge = new BridgeService(w.plugin, mindmapEditorAdapter);
		bridge.start();
		await new Promise((resolve) => window.setTimeout(resolve, 0));
		const notice = (map: typeof first): Element | null =>
			map.container.querySelector('.annoteca-mmb-storage-notice');
		expect(notice(first)).not.toBeNull();
		expect(notice(second)).not.toBeNull();

		const later = Array.from(
			defined(notice(first)).querySelectorAll('button'),
		).find((b) => b.textContent === 'Not now');
		defined(later).click();

		expect(notice(first)).toBeNull();
		expect(notice(second)).toBeNull();
		bridge.stop();
	});
});

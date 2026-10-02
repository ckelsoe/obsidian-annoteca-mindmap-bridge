// Finds the open maps, gives each one a decorator, and tells them when to
// reload: Annoteca's index changed, a mapped note changed, or the workspace
// layout changed. Owns the Annoteca subscription and the layout status the
// settings tab shows.

import { debounce, Notice, TFile } from 'obsidian';
import type { App, Debouncer, Plugin, WorkspaceLeaf } from 'obsidian';
import type { AnnotecaApi } from './annoteca-api';
import type { MapAdapter } from './adapters/map-adapter';
import { annotecaStatus } from './annoteca';
import type { AnnotecaStatus } from './annoteca';
import { MapDecorator } from './map-decorator';
import { liveText, savedText } from './note-text';
import { convertToEndOfFile } from './storage-guard';

// Long enough to fold a burst of index changes (a save touches several notes'
// entries) into one reload, short enough to feel live.
const RELOAD_DELAY_MS = 150;

export class BridgeService {
	private readonly app: App;
	private readonly decorators = new Map<WorkspaceLeaf, MapDecorator>();
	private subscribed: { api: AnnotecaApi; off: () => void } | null = null;
	private layoutProblem: string | null = null;
	private readonly reloadAll: Debouncer<[], void>;
	private stopped = false;

	// Notes whose storage notice the user set aside this session.
	private readonly noticeDismissed = new Set<string>();
	private converting = false;

	// The notice about a missing or outdated Annoteca shows once a session.
	private warnedAbout: AnnotecaStatus['kind'] | null = null;

	constructor(
		private readonly plugin: Plugin,
		private readonly adapter: MapAdapter,
	) {
		this.app = plugin.app;
		this.reloadAll = debounce(
			() => {
				for (const decorator of this.decorators.values())
					void decorator.refresh();
			},
			RELOAD_DELAY_MS,
			true,
		);
	}

	start(): void {
		const { workspace, vault } = this.app;
		this.plugin.registerEvent(
			workspace.on('layout-change', () => this.sync()),
		);
		this.plugin.registerEvent(
			workspace.on('active-leaf-change', () => this.sync()),
		);
		this.plugin.registerEvent(
			vault.on('modify', (file) => {
				if (file instanceof TFile && this.isMapped(file.path))
					this.reloadAll();
			}),
		);
		this.plugin.registerEvent(vault.on('rename', () => this.sync()));
		workspace.onLayoutReady(() => this.sync());
	}

	stop(): void {
		this.stopped = true;
		this.reloadAll.cancel();
		this.subscribed?.off();
		this.subscribed = null;
		for (const decorator of this.decorators.values()) decorator.dispose();
		this.decorators.clear();
	}

	annoteca(): AnnotecaStatus {
		return annotecaStatus(this.app);
	}

	// Null while every open map reads as expected.
	layoutStatus(): string | null {
		return this.layoutProblem;
	}

	mapCount(): number {
		return this.decorators.size;
	}

	mapPluginLoaded(): boolean {
		const registry = (
			this.app as {
				plugins?: { getPlugin(id: string): unknown };
			}
		).plugins;
		return Boolean(registry?.getPlugin(this.adapter.pluginId));
	}

	mapPluginName(): string {
		return this.adapter.pluginName;
	}

	// Match the decorators to the map leaves open now, and (re)subscribe to
	// Annoteca, which may have been enabled, disabled or updated since.
	sync(): void {
		if (this.stopped) return;
		this.subscribe();
		const leaves = new Set(
			this.app.workspace.getLeavesOfType(this.adapter.viewType),
		);
		for (const [leaf, decorator] of this.decorators) {
			if (leaves.has(leaf)) continue;
			decorator.dispose();
			this.decorators.delete(leaf);
		}
		for (const leaf of leaves) {
			const existing = this.decorators.get(leaf);
			if (existing) {
				existing.draw();
				continue;
			}
			const decorator = new MapDecorator(leaf, {
				adapter: this.adapter,
				annoteca: () => this.annoteca(),
				savedText: (path) => savedText(this.app, path),
				liveText: (path) => liveText(this.app, path),
				reportLayout: (problem) => this.reportLayout(problem),
				storageNoticeDismissed: (path) =>
					this.noticeDismissed.has(path),
				dismissStorageNotice: (path) => {
					this.noticeDismissed.add(path);
					this.drawAll();
				},
				convertStorage: (path) => void this.convertStorage(path),
			});
			this.decorators.set(leaf, decorator);
			void decorator.refresh();
		}
		if (leaves.size > 0) this.warnIfUnusable();
	}

	private warnIfUnusable(): void {
		const kind = this.annoteca().kind;
		if (kind === 'ready' || this.warnedAbout === kind) return;
		this.warnedAbout = kind;
		new Notice(
			kind === 'missing'
				? 'Annoteca MindMap Bridge needs the Annoteca plugin, installed and enabled, to show comments on mind maps.'
				: 'Annoteca MindMap Bridge needs Annoteca 1.20.0 or later. Update Annoteca to show comments on mind maps.',
		);
	}

	private drawAll(): void {
		for (const decorator of this.decorators.values()) decorator.draw();
	}

	// One conversion at a time; the note's change then reloads every map,
	// and the notice goes once its markers are on one line.
	private async convertStorage(path: string): Promise<void> {
		if (this.converting) return;
		this.converting = true;
		try {
			await convertToEndOfFile(this.app, path);
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: storage conversion failed',
				err,
			);
			new Notice('Could not convert the note to end-of-file storage.');
		} finally {
			this.converting = false;
		}
	}

	private isMapped(path: string): boolean {
		for (const leaf of this.decorators.keys())
			if (this.adapter.notePath(leaf) === path) return true;
		return false;
	}

	private subscribe(): void {
		const status = this.annoteca();
		const api = status.kind === 'ready' ? status.api : null;
		if ((this.subscribed?.api ?? null) === api) return;
		this.subscribed?.off();
		this.subscribed = null;
		if (api)
			this.subscribed = {
				api,
				off: api.onChange(() => this.reloadAll()),
			};
		// Annoteca appeared, went away or changed: every map reloads.
		this.reloadAll();
	}

	private reportLayout(problem: string | null): void {
		if (problem === this.layoutProblem) return;
		if (problem)
			console.warn(
				`Annoteca MindMap Bridge: ${this.adapter.pluginName}'s layout has changed (${problem}). Badges are off until the bridge is updated.`,
			);
		this.layoutProblem = problem;
	}
}

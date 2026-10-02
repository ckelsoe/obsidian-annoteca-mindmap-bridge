// Keeps one map leaf's badges in step with the note's comments and with the
// map's own redraws. Everything it learns about the map comes through the
// adapter, and every failure stops at this class: nothing here may throw into
// the map plugin's view.

import type { WorkspaceLeaf } from 'obsidian';
import type { ApiComment } from './annoteca-api';
import type { MapAdapter } from './adapters/map-adapter';
import type { AnnotecaStatus } from './annoteca';
import { badgesFor } from './badge-model';
import { clearNodeControls, drawNodeControls } from './badge-view';

export interface DecoratorDeps {
	readonly adapter: MapAdapter;
	annoteca(): AnnotecaStatus;
	// The note text the comments' marker offsets count into.
	savedText(path: string): Promise<string | null>;
	// The map's drawing no longer matches the adapter (null: it does again).
	reportLayout(problem: string | null): void;
}

interface Loaded {
	readonly path: string;
	readonly text: string;
	readonly comments: readonly ApiComment[];
}

export class MapDecorator {
	private loaded: Loaded | null = null;
	private observer: MutationObserver | null = null;
	private observed: HTMLElement | null = null;
	private frame: { win: Window; id: number } | null = null;
	private loadSeq = 0;
	private disposed = false;

	constructor(
		readonly leaf: WorkspaceLeaf,
		private readonly deps: DecoratorDeps,
	) {}

	// Re-read the note's comments, then redraw.
	async refresh(): Promise<void> {
		if (this.disposed) return;
		const seq = ++this.loadSeq;
		const path = this.deps.adapter.notePath(this.leaf);
		const status = this.deps.annoteca();
		if (!path || status.kind !== 'ready') {
			this.loaded = null;
			this.draw();
			return;
		}
		let text: string | null;
		let comments: readonly ApiComment[];
		try {
			[text, comments] = await Promise.all([
				this.deps.savedText(path),
				status.api.queryComments({ paths: [path], resolved: 'all' }),
			]);
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not read comments',
				err,
			);
			return;
		}
		// A newer refresh, a dispose or a switch to another note while this one
		// was reading makes its result stale.
		if (this.disposed || seq !== this.loadSeq) return;
		if (this.deps.adapter.notePath(this.leaf) !== path) return;
		this.loaded = text === null ? null : { path, text, comments };
		this.draw();
	}

	// Draw from what is loaded, against the map as it is drawn now. Runs from
	// the map's own redraws, so a failure is logged here, never rethrown.
	draw(): void {
		if (this.disposed) return;
		try {
			this.drawNow();
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not draw badges',
				err,
			);
		}
	}

	private drawNow(): void {
		const canvas = this.deps.adapter.canvas(this.leaf);
		this.watch(canvas);
		if (!canvas) return;
		const read = this.deps.adapter.readNodes(canvas);
		if (read.kind === 'broken') {
			clearNodeControls(canvas);
			this.deps.reportLayout(read.reason);
			return;
		}
		this.deps.reportLayout(null);
		const loaded = this.loaded;
		const path = this.deps.adapter.notePath(this.leaf);
		if (!loaded || loaded.path !== path) {
			clearNodeControls(canvas);
			// The map moved to another note without anything else telling the
			// bridge; load that note's comments.
			if (loaded && path) void this.refresh();
			return;
		}
		drawNodeControls(
			read.nodes,
			badgesFor(read.nodes, loaded.comments, loaded.text),
		);
	}

	dispose(): void {
		this.disposed = true;
		this.cancelFrame();
		this.observer?.disconnect();
		this.observer = null;
		const canvas = this.observed;
		this.observed = null;
		if (canvas) clearNodeControls(canvas);
	}

	// One observer per canvas. A redraw empties the canvas and appends new node
	// elements, which drops the badges; redraw them on the next frame, once,
	// however many changes the redraw made.
	private watch(canvas: HTMLElement | null): void {
		if (canvas === this.observed) return;
		this.observer?.disconnect();
		this.observer = null;
		this.observed = canvas;
		if (!canvas) return;
		const Observer = canvas.win.MutationObserver;
		this.observer = new Observer((records) => {
			if (records.some((r) => this.deps.adapter.touchesNodes(r)))
				this.schedule(canvas.win);
		});
		this.observer.observe(canvas, { childList: true });
	}

	private schedule(win: Window): void {
		if (this.frame) return;
		this.frame = {
			win,
			id: win.requestAnimationFrame(() => {
				this.frame = null;
				this.draw();
			}),
		};
	}

	private cancelFrame(): void {
		if (!this.frame) return;
		this.frame.win.cancelAnimationFrame(this.frame.id);
		this.frame = null;
	}
}

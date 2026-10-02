// Keeps one map leaf's badges in step with the note's comments and with the
// map's own redraws. Everything it learns about the map comes through the
// adapter, and every failure stops at this class: nothing here may throw into
// the map plugin's view.

import type { WorkspaceLeaf } from 'obsidian';
import type { ApiComment } from './annoteca-api';
import type { MapAdapter } from './adapters/map-adapter';
import type { AnnotecaStatus } from './annoteca';
import { badgesFor } from './badge-model';
import type { NodeBadge } from './badge-model';
import { clearNodeControls, drawNodeControls } from './badge-view';
import type { NodeControlActions } from './badge-view';
import { NodeActions } from './node-actions';
import type { NodeTarget } from './node-actions';
import { multiLineMarkers } from './storage-guard';
import { clearStorageNotice, drawStorageNotice } from './storage-notice';

export interface DecoratorDeps {
	readonly adapter: MapAdapter;
	annoteca(): AnnotecaStatus;
	// The note text the comments' marker offsets count into.
	savedText(path: string): Promise<string | null>;
	// The note's live text, which compose() checks a range against.
	liveText(path: string): Promise<string | null>;
	// The map's drawing no longer matches the adapter (null: it does again).
	reportLayout(problem: string | null): void;
	// The storage notice: whether the user set it aside for a note this
	// session, and its two buttons.
	storageNoticeDismissed(path: string): boolean;
	dismissStorageNotice(path: string): void;
	convertStorage(path: string): void;
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
	// The note the last refresh set out to load, loaded or not. A redraw
	// showing a different note starts a refresh; one showing this note does
	// not, so an Annoteca that cannot answer is not asked again on every
	// redraw.
	private requested: string | null = null;
	private disposed = false;
	private readonly actions: NodeActions;
	private readonly controls: NodeControlActions;

	constructor(
		readonly leaf: WorkspaceLeaf,
		private readonly deps: DecoratorDeps,
	) {
		this.actions = new NodeActions({
			annoteca: () => deps.annoteca(),
			liveText: (path) => deps.liveText(path),
		});
		this.controls = {
			openBadge: (nodeEl, anchor) => {
				const target = this.target(nodeEl);
				if (target) void this.actions.open(target, anchor);
			},
			addComment: (nodeEl) => {
				const target = this.target(nodeEl);
				if (target) void this.actions.add(target);
			},
		};
	}

	// Re-read the note's comments, then redraw.
	async refresh(): Promise<void> {
		if (this.disposed) return;
		const seq = ++this.loadSeq;
		const path = this.deps.adapter.notePath(this.leaf);
		this.requested = path;
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
		// Separately guarded: a failure in the notice must not take the
		// badges down with it.
		try {
			this.drawNotice();
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not draw the storage notice',
				err,
			);
		}
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
			// The map shows a note nothing has loaded yet: it switched notes, or
			// it was given its note after it was created.
			if (path && path !== this.requested) void this.refresh();
			return;
		}
		drawNodeControls(
			read.nodes,
			badgesFor(read.nodes, loaded.comments, loaded.text),
			this.controls,
		);
	}

	// The storage notice depends only on the note, not on how the map is
	// drawn, so it shows even while the badges are off.
	private drawNotice(): void {
		const anchor = this.deps.adapter.noticeAnchor(this.leaf);
		if (!anchor) return;
		const loaded = this.loaded;
		const path = this.deps.adapter.notePath(this.leaf);
		if (
			!loaded ||
			loaded.path !== path ||
			this.deps.storageNoticeDismissed(loaded.path)
		) {
			clearStorageNotice(anchor);
			return;
		}
		const notePath = loaded.path;
		drawStorageNotice(
			anchor,
			multiLineMarkers(loaded.text, loaded.comments),
			{
				convert: () => this.deps.convertStorage(notePath),
				dismiss: () => this.deps.dismissStorageNotice(notePath),
			},
		);
	}

	// The node a control was pressed on, as the map and the loaded comments
	// stand at the moment of the press.
	private target(nodeEl: HTMLElement): NodeTarget | null {
		if (this.disposed) return null;
		const canvas = this.deps.adapter.canvas(this.leaf);
		const path = this.deps.adapter.notePath(this.leaf);
		if (!canvas || !path) return null;
		const read = this.deps.adapter.readNodes(canvas);
		if (read.kind === 'broken') return null;
		const node = read.nodes.find((n) => n.el === nodeEl);
		if (!node) return null;
		const loaded = this.loaded;
		let badge: NodeBadge | undefined;
		if (loaded?.path === path)
			badge = badgesFor(read.nodes, loaded.comments, loaded.text).get(
				node,
			);
		return { path, line: node.line, badge };
	}

	dispose(): void {
		this.disposed = true;
		this.cancelFrame();
		this.observer?.disconnect();
		this.observer = null;
		const canvas = this.observed;
		this.observed = null;
		if (canvas) clearNodeControls(canvas);
		clearStorageNotice(this.deps.adapter.noticeAnchor(this.leaf));
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

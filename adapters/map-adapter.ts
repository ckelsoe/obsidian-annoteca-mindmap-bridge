// What the bridge needs to know about a mind map plugin, and nothing more.
// Each supported plugin gets one adapter file implementing this; the rest of
// the bridge never names a mind map plugin's classes, attributes or view type.

import type { WorkspaceLeaf } from 'obsidian';

// One drawn node: its element and the source lines it shows. `line` is the
// node's own 0-based line in the note (-1 for a root that stands for the
// note itself); `bodyLines` are the other note lines drawn inside it.
export interface MapNode {
	readonly el: HTMLElement;
	readonly line: number;
	readonly bodyLines: readonly number[];
}

// A read of one map's canvas. `broken` means the map is drawn but not in the
// shape the adapter knows, so the plugin it reads has changed.
export type MapRead =
	| { readonly kind: 'nodes'; readonly nodes: readonly MapNode[] }
	| { readonly kind: 'broken'; readonly reason: string };

export interface MapAdapter {
	// The mind map plugin's id and its name as users see it.
	readonly pluginId: string;
	readonly pluginName: string;
	// The view type a map leaf has.
	readonly viewType: string;
	// The note a map leaf shows, or null when it shows none.
	notePath(leaf: WorkspaceLeaf): string | null;
	// The element the map draws its nodes into, or null when the view has not
	// drawn one (a deferred leaf, or a view still loading).
	canvas(leaf: WorkspaceLeaf): HTMLElement | null;
	// The element a notice for this map is placed in front of, so the notice
	// takes its own row above the map instead of scrolling with it.
	noticeAnchor(leaf: WorkspaceLeaf): HTMLElement | null;
	// The drawn nodes, read from the canvas.
	readNodes(canvas: HTMLElement): MapRead;
	// Whether a DOM change under the canvas can have added, removed or
	// replaced nodes, so the badges need drawing again.
	touchesNodes(record: MutationRecord): boolean;
}

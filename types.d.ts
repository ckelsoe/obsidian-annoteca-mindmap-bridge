// Local type augmentations for the Obsidian API.
// Add type declarations here when the Obsidian types are missing or need extension.
// NEVER use `as any` to work around missing types. Add a proper declaration here instead.

import 'obsidian';

declare global {
	// Obsidian installs createEl / createDiv / createSpan on every window, but
	// obsidian.d.ts declares them only as globals and on Node, never as members
	// of the DOM Window interface. eslint-plugin-obsidianmd 0.4.x's
	// prefer-create-el rule asks you to replace `doc.createElement(...)` with
	// `doc.win.createEl(...)` or `activeWindow.createDiv()`; without these
	// declarations that form resolves as `any` and cascades into no-unsafe-*
	// errors. Keep this block if the plugin builds detached elements.
	interface Window {
		createEl<K extends keyof HTMLElementTagNameMap>(
			tag: K,
			o?: DomElementInfo | string,
			callback?: (el: HTMLElementTagNameMap[K]) => void,
		): HTMLElementTagNameMap[K];
		createDiv(
			o?: DomElementInfo | string,
			callback?: (el: HTMLDivElement) => void,
		): HTMLDivElement;
		createSpan(
			o?: DomElementInfo | string,
			callback?: (el: HTMLSpanElement) => void,
		): HTMLSpanElement;
		// Each window has its own constructor. A pop-out's canvas is observed
		// with the pop-out's own, reached through the node's `win`.
		MutationObserver: typeof MutationObserver;
	}
}

declare module 'obsidian' {
	interface PluginManifest {
		version: string;
	}

	// Obsidian internals the official types do not declare. Declared once
	// here so every caller shares one shape.
	interface App {
		// The installed plugins. getPlugin answers null for a plugin that is
		// not loaded; `api` is whatever public API a plugin exposes.
		plugins: {
			getPlugin(id: string): { api?: unknown } | null;
		};
		// Runs a registered command by id; false when it did not run (an
		// editor command with no active editor, or an unknown id).
		commands: {
			executeCommandById(id: string): boolean;
		};
	}
}

// A note's text as Annoteca counts offsets: every line break one \n, even in
// a file saved with Windows (CRLF) or old Mac (CR) line endings.

import { MarkdownView } from 'obsidian';
import type { App } from 'obsidian';

function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n?/g, '\n');
}

// The note's text on disk. This is what Annoteca's comment index was built
// from, so it is the text the offsets queryComments returns count into.
export async function savedText(
	app: App,
	path: string,
): Promise<string | null> {
	const file = app.vault.getFileByPath(path);
	if (!file) return null;
	return normalizeLineEndings(await app.vault.cachedRead(file));
}

// The note's live text: an open editor's when there is one, which can be
// ahead of the disk by unsaved typing, else the disk. This is the text
// Annoteca's compose() checks a range against.
export async function liveText(app: App, path: string): Promise<string | null> {
	for (const leaf of app.workspace.getLeavesOfType('markdown')) {
		const view = leaf.view;
		if (view instanceof MarkdownView && view.file?.path === path)
			return normalizeLineEndings(view.editor.getValue());
	}
	return savedText(app, path);
}

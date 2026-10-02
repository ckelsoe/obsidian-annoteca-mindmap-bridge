// A note's text as Annoteca counts offsets: every line break one \n, even in
// a file saved with Windows (CRLF) or old Mac (CR) line endings.

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

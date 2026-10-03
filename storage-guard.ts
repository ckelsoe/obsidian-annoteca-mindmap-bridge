// Whether a note's comments are stored in a way the map can damage, and the
// one way the bridge offers to fix it.
//
// Annoteca's inline storage writes a comment's body, thread and metadata
// inside its marker, across several lines. Mind map editor edits a note line
// by line, so moving or deleting a node moves only the marker's first line
// and strands the rest, which corrupts the comment. End-of-file storage
// keeps one-line markers in the text and the rest in a store at the end of
// the note, so a node carries its whole marker with it. Annoteca converts a
// note itself; the bridge only offers to run that, never runs it unasked.

import { MarkdownView, Notice } from 'obsidian';
import type { App, WorkspaceLeaf } from 'obsidian';
import type { ApiComment } from './annoteca-api';

// Annoteca's command for this. An editorCallback: it acts on the active
// Markdown editor, so the note has to be open and active when it runs.
const CONVERT_COMMAND = 'annoteca:convert-note-to-eof-storage';

// How many of the comments have a marker that spans lines. `text` is the
// note text the marker offsets count into.
export function multiLineMarkers(
	text: string,
	comments: readonly ApiComment[],
): number {
	return comments.filter((c) =>
		text.slice(c.marker.start, c.marker.end).includes('\n'),
	).length;
}

function markdownLeafFor(app: App, path: string): WorkspaceLeaf | null {
	// By view state, so a restored background tab that was never opened (a
	// deferred view with no file yet) is found too.
	for (const leaf of app.workspace.getLeavesOfType('markdown'))
		if (leaf.getViewState().state?.file === path) return leaf;
	return null;
}

// Open the note in a Markdown editor, make it active, and run Annoteca's
// conversion there. Resolves whether the command ran.
export async function convertToEndOfFile(
	app: App,
	path: string,
): Promise<boolean> {
	const file = app.vault.getFileByPath(path);
	if (!file) return false;
	let leaf = markdownLeafFor(app, path);
	if (!leaf) {
		leaf = app.workspace.getLeaf('tab');
		await leaf.openFile(file);
	}
	await app.workspace.revealLeaf(leaf);
	app.workspace.setActiveLeaf(leaf, { focus: true });
	// The command converts whatever note is active. The leaf may have moved
	// to another note while it opened, so check before running it: a note
	// the user did not ask for must never be rewritten.
	const active = app.workspace.getActiveViewOfType(MarkdownView);
	if (active?.file?.path !== path) {
		new Notice(
			'Could not convert the note: another note became active. Try again.',
		);
		return false;
	}
	const ran = app.commands.executeCommandById(CONVERT_COMMAND);
	if (!ran)
		new Notice(
			'Could not run the conversion. Open the note, then convert it to end-of-file comment storage from the command palette.',
		);
	return ran;
}

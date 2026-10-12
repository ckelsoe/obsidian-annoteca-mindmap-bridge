// What the controls on a node do: list its comments to open, resolve or
// reopen in Annoteca, or ask Annoteca to start a comment on the node's text.
// Everything goes through Annoteca's public API; the bridge never writes the
// note.

import { Menu, Notice } from 'obsidian';
import type { ApiComment } from './annoteca-api';
import { canResolve } from './annoteca';
import type { AnnotecaStatus } from './annoteca';
import type { NodeBadge } from './badge-model';
import { composeRange } from './node-range';

// The node a control was pressed on, looked up when it was pressed.
export interface NodeTarget {
	readonly path: string;
	readonly line: number;
	// The text the map drew its nodes from, or null when it cannot be told.
	readonly renderedSource: string | null;
	readonly badge: NodeBadge | undefined;
}

export interface NodeActionDeps {
	annoteca(): AnnotecaStatus;
	// The note's live text, the text compose() checks a range against.
	liveText(path: string): Promise<string | null>;
}

const SNIPPET_LENGTH = 48;

// The first words of a comment, on one line.
export function snippet(body: string): string {
	const line = body.replace(/\s+/g, ' ').trim();
	if (line.length <= SNIPPET_LENGTH) return line;
	return `${line.slice(0, SNIPPET_LENGTH).trimEnd()}...`;
}

export class NodeActions {
	// One compose at a time: a second press while Annoteca opens the note
	// would open a second form on the same text.
	private composing = false;

	constructor(private readonly deps: NodeActionDeps) {}

	// A menu of the node's comments, each with its actions, even when there
	// is only one: one behaviour for every badge, and Resolve and Reopen are
	// reachable on touch, where there is no right-click.
	open(target: NodeTarget, anchor: HTMLElement): void {
		try {
			this.openNow(target, anchor);
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not open comments',
				err,
			);
			new Notice('Could not open the comments on this node.');
		}
	}

	private openNow(target: NodeTarget, anchor: HTMLElement): void {
		const comments = target.badge?.comments ?? [];
		const status = this.deps.annoteca();
		if (status.kind !== 'ready' || comments.length === 0) return;
		const resolvable = canResolve(status.api);
		const names = new Map(
			status.api.categories().map((c) => [c.id, c.displayName]),
		);
		const menu = new Menu();
		comments.forEach(({ comment, drawn }, index) => {
			if (index > 0) menu.addSeparator();
			const notes: string[] = [];
			if (comment.resolved) notes.push('resolved');
			else if (comment.addressed) notes.push('edit awaiting review');
			if (!drawn) notes.push('hidden on the map');
			const name = names.get(comment.category) ?? comment.category;
			const extra = notes.length ? ` (${notes.join(', ')})` : '';
			menu.addItem((item) => {
				item.setTitle(`${name}: ${snippet(comment.body)}${extra}`);
				item.setIcon('message-square');
				if (comment.id === undefined) item.setDisabled(true);
				else item.onClick(() => void this.reveal(comment));
			});
			// Annoteca finds a comment by its id, so one without an id can only
			// be acted on from the note.
			if (!resolvable || comment.id === undefined) return;
			if (comment.resolved)
				menu.addItem((item) =>
					item
						.setTitle('Reopen')
						.setIcon('rotate-ccw')
						.onClick(() => void this.change(comment, 'reopen')),
				);
			else if (comment.addressed)
				// A proposed edit is decided by accept, revise or reject, in
				// Annoteca, never by a bare resolve from the map.
				menu.addItem((item) =>
					item
						.setTitle('Review the proposed edit')
						.setIcon('eye')
						.onClick(() => void this.reveal(comment)),
				);
			else
				menu.addItem((item) =>
					item
						.setTitle('Resolve')
						.setIcon('check')
						.onClick(() => void this.change(comment, 'resolve')),
				);
		});
		const rect = anchor.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom }, anchor.doc);
	}

	async add(target: NodeTarget): Promise<void> {
		if (this.composing) return;
		const status = this.deps.annoteca();
		if (status.kind !== 'ready') return;
		this.composing = true;
		try {
			const text = await this.deps.liveText(target.path);
			// The map's line numbers count into the text it last drew. If the
			// node's line there differs from the same line now (a line typed
			// above it, the node deleted, its text edited), the map is behind
			// the editor and the range would land on the wrong text. Without
			// the drawn text there is no way to be sure, so refuse.
			if (target.renderedSource === null) {
				new Notice(
					'Could not tell which text this node shows. Comment on it from the note instead.',
				);
				return;
			}
			const drawnLine = target.renderedSource.split('\n')[target.line];
			if (text !== null && text.split('\n')[target.line] !== drawnLine) {
				new Notice(
					'The map has not caught up with your latest edits. Try again in a moment.',
				);
				return;
			}
			const range =
				text === null ? null : composeRange(text, target.line);
			if (!range) {
				new Notice('This node has no text to comment on.');
				return;
			}
			const opened = await status.api.compose(target.path, range);
			if (!opened)
				new Notice(
					'Annoteca could not start a comment on this node. Its text may overlap another comment.',
				);
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not start a comment',
				err,
			);
			new Notice('Could not start a comment on this node.');
		} finally {
			this.composing = false;
		}
	}

	// Resolve or reopen through Annoteca, which writes the note and shows its
	// own notice ("Resolved.", "Reopened."); the badge updates when its index
	// changes. Only the answers Annoteca does not narrate are reported here.
	private async change(
		comment: ApiComment,
		verb: 'resolve' | 'reopen',
	): Promise<void> {
		const status = this.deps.annoteca();
		if (status.kind !== 'ready' || !canResolve(status.api)) return;
		if (comment.id === undefined) return;
		try {
			const result =
				verb === 'resolve'
					? await status.api.resolve(comment.id)
					: await status.api.reopen(comment.id);
			if (result === 'not-found')
				new Notice('That comment is no longer in the note.');
			else if (result === 'addressed')
				new Notice(
					'This comment has a proposed edit waiting. Open it to accept, revise or reject the edit.',
				);
		} catch (err) {
			console.error(
				`Annoteca MindMap Bridge: could not ${verb} a comment`,
				err,
			);
			new Notice(
				verb === 'resolve'
					? 'Could not resolve that comment.'
					: 'Could not reopen that comment.',
			);
		}
	}

	private async reveal(comment: ApiComment): Promise<void> {
		const status = this.deps.annoteca();
		if (status.kind !== 'ready') return;
		if (comment.id === undefined) {
			// Annoteca finds a comment by its id; an old comment without one can
			// only be opened from the note.
			new Notice(
				'This comment cannot be opened from the map. Open it from the note.',
			);
			return;
		}
		try {
			const found = await status.api.reveal(comment.id);
			if (!found) new Notice('That comment is no longer in the note.');
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not open a comment',
				err,
			);
			new Notice('Could not open that comment.');
		}
	}
}

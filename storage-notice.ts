// The notice bar a map shows when its note's comments use multi-line
// markers: what is at risk, and a button that converts the note. It sits in
// its own row above the map, never inside the map's own elements.

const NOTICE_CLASS = 'annoteca-mmb-storage-notice';

export interface StorageNoticeActions {
	convert(): void;
	dismiss(): void;
}

function existingNotice(anchor: HTMLElement): HTMLElement | null {
	const previous = anchor.previousElementSibling;
	return previous?.instanceOf(HTMLElement) && previous.hasClass(NOTICE_CLASS)
		? previous
		: null;
}

function message(count: number): string {
	const which =
		count === 1
			? "One of this note's Annoteca comments is"
			: `${count} of this note's Annoteca comments are`;
	return `${which} stored across several lines. Moving or deleting nodes on the map can split a comment and damage it. End-of-file storage keeps each comment on one line.`;
}

// Show the notice for `count` multi-line comments, or remove it at 0.
export function drawStorageNotice(
	anchor: HTMLElement,
	count: number,
	actions: StorageNoticeActions,
): void {
	const existing = existingNotice(anchor);
	if (count === 0) {
		existing?.remove();
		return;
	}
	if (existing?.dataset.annotecaMmbCount === String(count)) return;
	existing?.remove();
	const parent = anchor.parentElement;
	if (!parent) return;
	const bar = parent.createDiv({
		cls: NOTICE_CLASS,
		attr: { role: 'status' },
	});
	parent.insertBefore(bar, anchor);
	bar.dataset.annotecaMmbCount = String(count);
	bar.createDiv({ cls: `${NOTICE_CLASS}-text`, text: message(count) });
	const buttons = bar.createDiv({ cls: `${NOTICE_CLASS}-buttons` });
	const convert = buttons.createEl('button', {
		cls: 'mod-cta',
		text: 'Convert to end-of-file storage',
	});
	convert.addEventListener('click', () => actions.convert());
	const later = buttons.createEl('button', { text: 'Not now' });
	later.addEventListener('click', () => actions.dismiss());
}

export function clearStorageNotice(anchor: HTMLElement | null): void {
	if (anchor) existingNotice(anchor)?.remove();
}

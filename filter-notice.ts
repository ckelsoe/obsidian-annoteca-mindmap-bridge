// The row a map shows while a badge filter is on, so a missing badge is not
// read as "no comments here". Says what is filtered, and clears it.

import { findBar, placeBar } from './notice-bar';

const FILTER_CLASS = 'annoteca-mmb-filter-notice';
// After the storage notice, which warns about damage.
const ORDER = 1;

// Show the row with `summary`, or remove it when the summary is null.
export function drawFilterNotice(
	anchor: HTMLElement,
	summary: string | null,
	clear: () => void,
): void {
	const existing = findBar(anchor, FILTER_CLASS);
	if (summary === null) {
		existing?.remove();
		return;
	}
	if (existing?.dataset.annotecaMmbSummary === summary) return;
	existing?.remove();
	const bar = placeBar(anchor, FILTER_CLASS, ORDER);
	if (!bar) return;
	bar.dataset.annotecaMmbSummary = summary;
	bar.createDiv({ cls: `${FILTER_CLASS}-text`, text: summary });
	const button = bar.createEl('button', { text: 'Clear filter' });
	button.addEventListener('click', () => clear());
}

export function clearFilterNotice(anchor: HTMLElement | null): void {
	if (anchor) findBar(anchor, FILTER_CLASS)?.remove();
}

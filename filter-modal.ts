// The picker behind "Filter comment badges": which comments the badges
// count. Categories are chosen in settings, where there is room to list them.

import { SuggestModal } from 'obsidian';
import type { App } from 'obsidian';
import { SHOW_LABELS } from './settings';
import type { ShowFilter } from './settings';

const CHOICES: readonly ShowFilter[] = ['all', 'open', 'addressed'];

export class FilterModal extends SuggestModal<ShowFilter> {
	constructor(
		app: App,
		private readonly current: ShowFilter,
		private readonly choose: (show: ShowFilter) => void,
	) {
		super(app);
		this.setPlaceholder('Show on comment badges');
	}

	getSuggestions(query: string): ShowFilter[] {
		const q = query.trim().toLowerCase();
		return CHOICES.filter((c) => SHOW_LABELS[c].toLowerCase().includes(q));
	}

	renderSuggestion(show: ShowFilter, el: HTMLElement): void {
		el.setText(
			show === this.current
				? `${SHOW_LABELS[show]} (current)`
				: SHOW_LABELS[show],
		);
	}

	onChooseSuggestion(show: ShowFilter): void {
		this.choose(show);
	}
}

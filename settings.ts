// The bridge's saved settings: which comments the badges count, and whether
// nodes are tinted. Pure, so the filter is tested without a map.

import type { ApiComment } from './annoteca-api';

export type ShowFilter = 'all' | 'open' | 'addressed';

export interface BridgeSettings {
	// Which comments count on a badge.
	show: ShowFilter;
	// Categories whose comments count nowhere. The HIDDEN ids are stored, so a
	// category added later in Annoteca shows by default.
	hiddenCategories: string[];
	// Tint each node by how many open comments it holds.
	tint: boolean;
}

export const SHOW_LABELS: Readonly<Record<ShowFilter, string>> = {
	all: 'All comments',
	open: 'Open only',
	addressed: 'Awaiting review',
};

const SHOW_TEXT: Readonly<Record<ShowFilter, string>> = {
	all: 'all comments',
	open: 'open comments only',
	addressed: 'comments awaiting review only',
};

function isShowFilter(value: unknown): value is ShowFilter {
	return value === 'all' || value === 'open' || value === 'addressed';
}

export function defaultSettings(): BridgeSettings {
	return { show: 'all', hiddenCategories: [], tint: false };
}

// Whatever data.json holds, from any version or a hand edit: each field is
// kept only when it is the right shape, and falls back to its default.
export function normalizeSettings(raw: unknown): BridgeSettings {
	const settings = defaultSettings();
	if (typeof raw !== 'object' || raw === null) return settings;
	const data = raw as Record<string, unknown>;
	if (isShowFilter(data.show)) settings.show = data.show;
	if (Array.isArray(data.hiddenCategories))
		settings.hiddenCategories = [
			...new Set(
				data.hiddenCategories.filter(
					(id): id is string => typeof id === 'string' && id !== '',
				),
			),
		];
	if (typeof data.tint === 'boolean') settings.tint = data.tint;
	return settings;
}

// Whether a comment counts on the map under these settings.
export function showsComment(
	settings: BridgeSettings,
	comment: ApiComment,
): boolean {
	if (settings.hiddenCategories.includes(comment.category)) return false;
	switch (settings.show) {
		case 'all':
			return true;
		case 'open':
			return !comment.resolved;
		case 'addressed':
			// A proposed edit waiting for accept, revise or reject. Such a
			// comment is still open.
			return comment.addressed && !comment.resolved;
	}
}

// Whether any filter is set, before asking Annoteca which categories exist.
export function filterActive(settings: BridgeSettings): boolean {
	return settings.show !== 'all' || settings.hiddenCategories.length > 0;
}

// One line saying what the badges leave out, or null when they show
// everything. `categories` is Annoteca's list now: a hidden id it no longer
// has filters nothing, so it is not counted.
export function filterSummary(
	settings: BridgeSettings,
	categories: readonly string[],
): string | null {
	const hidden = categories.filter((id) =>
		settings.hiddenCategories.includes(id),
	).length;
	if (settings.show === 'all' && hidden === 0) return null;
	let text = `Badges show ${SHOW_TEXT[settings.show]}`;
	if (hidden > 0)
		text += `, in ${categories.length - hidden} of ${categories.length} categories`;
	return `${text}.`;
}

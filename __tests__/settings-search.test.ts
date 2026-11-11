// Obsidian's settings search finds a setting by its name, description and
// aliases. A section drawn by hand has none of those unless it is given them,
// so every one of them except the footer must carry a name and be searchable.

import type { App, Plugin } from 'obsidian';
import type { BridgeService } from '../bridge-service';
import { defaultSettings } from '../settings';
import { BridgeSettingTab } from '../settings-tab';
import type { SettingsStore } from '../settings-tab';

interface Item {
	type?: string;
	name?: string;
	desc?: unknown;
	aliases?: unknown;
	searchable?: boolean;
	render?: unknown;
	items?: Item[];
}

function leaves(items: Item[]): Item[] {
	return items.flatMap((i) => (i.items ? leaves(i.items) : [i]));
}

describe('settings search', () => {
	const bridge = {
		mapPluginName: () => 'Mind map editor',
	} as unknown as BridgeService;
	const store: SettingsStore = {
		settings: defaultSettings,
		update: () => Promise.resolve(),
	};
	const tab = new BridgeSettingTab({} as App, {} as Plugin, bridge, store);
	const items = leaves(tab.getSettingDefinitions() as unknown as Item[]);
	const custom = items.filter((i) => i.render !== undefined && !i.type);

	it('gives every hand-drawn section a name and makes it searchable, except the footer', () => {
		// Obsidian treats an absent `searchable` as true.
		const hidden = custom.filter((i) => i.searchable === false);
		expect(hidden.map((i) => i.name)).toEqual(['About']);
		for (const i of custom.filter((c) => c.searchable !== false)) {
			// toMatch fails on a missing name as well as an empty one.
			expect(i.name).toMatch(/\S/);
			expect(typeof i.desc).toBe('string');
			expect(Array.isArray(i.aliases)).toBe(true);
		}
	});

	it('finds the sections people look for by name', () => {
		const names = items.map((i) => i.name);
		for (const n of ['Categories', 'Annoteca', 'Mind map editor'])
			expect(names).toContain(n);
	});
});

import { PluginSettingTab, ToggleComponent } from 'obsidian';
import type { App, Plugin, Setting, SettingDefinitionItem } from 'obsidian';
import { canResolve } from './annoteca';
import type { BridgeService } from './bridge-service';
import { SHOW_LABELS } from './settings';
import type { BridgeSettings } from './settings';

// The settings the tab reads and changes; the plugin owns them.
export interface SettingsStore {
	settings(): BridgeSettings;
	update(patch: Partial<BridgeSettings>): Promise<void>;
}

// Community discussion for this plugin. This must stay a never-expiring
// discord.gg invite: a discord.com/channels/... deep link only resolves for
// accounts already in the server, so it cannot get anyone in, and a default
// invite expires after 7 days and would rot in a shipped release.
const DISCORD_URL = 'https://discord.gg/gd6tKJDPj4';

const REPO_URL = 'https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge';

export class BridgeSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: Plugin,
		private readonly bridge: BridgeService,
		private readonly store: SettingsStore,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Badges',
				items: [
					{
						name: 'Show',
						desc: 'Which comments the badges count. While a filter is on, a row above the map says so.',
						control: {
							type: 'dropdown',
							key: 'show',
							options: { ...SHOW_LABELS },
						},
					},
					{
						name: 'Categories',
						searchable: false,
						render: (setting: Setting) => {
							this.renderCategories(setting);
						},
					},
					{
						name: 'Tint nodes by open comments',
						desc: 'Shade each node by how many open comments it holds: one, two or three, or four and more.',
						control: { type: 'toggle', key: 'tint' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Status',
				items: [
					{
						name: 'Annoteca',
						searchable: false,
						render: (setting: Setting) => {
							setting.setDesc(this.annotecaStatus());
						},
					},
					{
						name: this.bridge.mapPluginName(),
						searchable: false,
						render: (setting: Setting) => {
							setting.setDesc(this.mapStatus());
						},
					},
				],
			},
			{
				name: 'About',
				searchable: false,
				render: (setting: Setting) => {
					this.renderFooter(setting);
				},
			},
		];
	}

	getControlValue(key: string): unknown {
		const settings = this.store.settings();
		if (key === 'show') return settings.show;
		if (key === 'tint') return settings.tint;
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === 'show' && typeof value === 'string' && value in SHOW_LABELS)
			await this.store.update({ show: value as BridgeSettings['show'] });
		else if (key === 'tint' && typeof value === 'boolean')
			await this.store.update({ tint: value });
	}

	// One toggle per Annoteca category, stacked under the name so the list
	// has the full width. Annoteca's categories are only known at runtime.
	private renderCategories(setting: Setting): void {
		setting.settingEl.addClass('annoteca-mmb-stacked-setting');
		setting.setDesc(
			'Turn a category off to leave its comments off the map.',
		);
		const list = setting.controlEl.createDiv({
			cls: 'annoteca-mmb-category-list',
		});
		const status = this.bridge.annoteca();
		if (status.kind !== 'ready') {
			list.createDiv({
				cls: 'setting-item-description',
				text: 'Connect Annoteca to choose categories.',
			});
			return;
		}
		for (const category of status.api.categories()) {
			const row = list.createDiv({ cls: 'annoteca-mmb-category-row' });
			row.createSpan({ text: category.displayName });
			new ToggleComponent(row)
				.setValue(
					!this.store
						.settings()
						.hiddenCategories.includes(category.id),
				)
				.onChange((on) => {
					const hidden = this.store
						.settings()
						.hiddenCategories.filter((id) => id !== category.id);
					if (!on) hidden.push(category.id);
					void this.store.update({ hiddenCategories: hidden });
				});
		}
	}

	private annotecaStatus(): string {
		const status = this.bridge.annoteca();
		if (status.kind === 'missing')
			return 'Not found. Install and enable Annoteca to see comments on mind maps.';
		if (status.kind === 'outdated')
			return 'Too old. Update Annoteca to 1.20.0 or later.';
		const connected = `Connected (API version ${status.api.apiVersion}).`;
		return canResolve(status.api)
			? connected
			: `${connected} Update Annoteca to 1.22.0 or later to resolve comments from the map.`;
	}

	private mapStatus(): string {
		const name = this.bridge.mapPluginName();
		if (!this.bridge.mapPluginLoaded())
			return `Not found. Install and enable ${name} to draw mind maps.`;
		const problem = this.bridge.layoutStatus();
		if (problem)
			return `${name}'s layout has changed (${problem}). Badges are off until this plugin is updated.`;
		const maps = this.bridge.mapCount();
		return maps === 1
			? 'Connected, 1 map open.'
			: `Connected, ${maps} maps open.`;
	}

	private renderFooter(setting: Setting): void {
		const el = setting.settingEl;
		el.empty();
		el.addClass('annoteca-mindmap-bridge-settings-footer');
		// One inner flex container; separators are the gap, not text whitespace.
		const inner = el.createDiv({
			cls: 'annoteca-mindmap-bridge-footer-inner',
		});
		const manifestVersion = this.plugin.manifest.version || '0.0.0';
		inner.createSpan({ text: `Version ${manifestVersion}` });
		// Separator and its link are ONE nowrap item, so a narrow pane never
		// wraps a line that starts or ends with a stray separator.
		const link = (text: string, url: string): HTMLAnchorElement => {
			const item = inner.createSpan({
				cls: 'annoteca-mindmap-bridge-footer-link',
			});
			item.createSpan({
				cls: 'annoteca-mindmap-bridge-footer-separator',
				text: '|',
			});
			return item.createEl('a', {
				text,
				href: url,
				attr: { target: '_blank', rel: 'noopener' },
			});
		};
		link('GitHub', REPO_URL);
		link('Discord', DISCORD_URL);
		link('Report issues', `${REPO_URL}/issues`);
	}
}

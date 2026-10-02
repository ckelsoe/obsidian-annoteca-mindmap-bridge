import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, Setting, SettingDefinitionItem } from 'obsidian';
import type { BridgeService } from './bridge-service';

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
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
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

	private annotecaStatus(): string {
		const status = this.bridge.annoteca();
		if (status.kind === 'missing')
			return 'Not found. Install and enable Annoteca to see comments on mind maps.';
		if (status.kind === 'outdated')
			return 'Too old. Update Annoteca to 1.20.0 or later.';
		return `Connected (API version ${status.api.apiVersion}).`;
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

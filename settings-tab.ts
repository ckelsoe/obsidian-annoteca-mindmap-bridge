import { PluginSettingTab } from 'obsidian';
import type { App, Plugin, Setting, SettingDefinitionItem } from 'obsidian';

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
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'About',
				searchable: false,
				render: (setting: Setting) => {
					this.renderFooter(setting);
				},
			},
		];
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

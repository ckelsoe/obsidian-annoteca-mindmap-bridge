import { Notice, Plugin } from 'obsidian';
import { mindmapEditorAdapter } from './adapters/mindmap-editor';
import { BridgeService } from './bridge-service';
import { FilterModal } from './filter-modal';
import { defaultSettings, normalizeSettings } from './settings';
import type { BridgeSettings } from './settings';
import { BridgeSettingTab } from './settings-tab';

export default class AnnotecaMindmapBridgePlugin extends Plugin {
	private bridge: BridgeService | null = null;
	private prefs: BridgeSettings = defaultSettings();

	async onload(): Promise<void> {
		this.prefs = normalizeSettings(await this.loadData());
		const bridge = new BridgeService(this, mindmapEditorAdapter, {
			settings: () => this.prefs,
			clearFilter: () =>
				void this.updateSettings({ show: 'all', hiddenCategories: [] }),
		});
		this.bridge = bridge;
		bridge.start();
		this.addSettingTab(
			new BridgeSettingTab(this.app, this, bridge, {
				settings: () => this.prefs,
				update: (patch) => this.updateSettings(patch),
			}),
		);
		this.addCommand({
			id: 'filter-comment-badges',
			name: 'Filter comment badges',
			callback: () =>
				new FilterModal(
					this.app,
					this.prefs.show,
					(show) => void this.updateSettings({ show }),
				).open(),
		});
		this.addCommand({
			id: 'next-node-with-comments',
			name: 'Go to next node with comments',
			checkCallback: (checking) => bridge.goTo(1, checking),
		});
		this.addCommand({
			id: 'previous-node-with-comments',
			name: 'Go to previous node with comments',
			checkCallback: (checking) => bridge.goTo(-1, checking),
		});
	}

	onunload(): void {
		this.bridge?.stop();
		this.bridge = null;
	}

	// The maps follow the change at once; a failed save is reported, never
	// left as an unhandled rejection from a button or a command.
	private async updateSettings(
		patch: Partial<BridgeSettings>,
	): Promise<void> {
		this.prefs = { ...this.prefs, ...patch };
		this.bridge?.settingsChanged();
		try {
			await this.saveData(this.prefs);
		} catch (err) {
			console.error(
				'Annoteca MindMap Bridge: could not save settings',
				err,
			);
			new Notice('Could not save the mind map bridge settings.');
		}
	}
}

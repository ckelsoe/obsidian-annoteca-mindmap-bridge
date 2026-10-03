import { Plugin } from 'obsidian';
import { mindmapEditorAdapter } from './adapters/mindmap-editor';
import { BridgeService } from './bridge-service';
import { BridgeSettingTab } from './settings-tab';

export default class AnnotecaMindmapBridgePlugin extends Plugin {
	private bridge: BridgeService | null = null;

	onload(): void {
		const bridge = new BridgeService(this, mindmapEditorAdapter);
		this.bridge = bridge;
		bridge.start();
		this.addSettingTab(new BridgeSettingTab(this.app, this, bridge));
	}

	onunload(): void {
		this.bridge?.stop();
		this.bridge = null;
	}
}

import { Plugin } from 'obsidian';
import { BridgeSettingTab } from './settings-tab';

export default class AnnotecaMindmapBridgePlugin extends Plugin {
	onload(): void {
		this.addSettingTab(new BridgeSettingTab(this.app, this));
	}
}

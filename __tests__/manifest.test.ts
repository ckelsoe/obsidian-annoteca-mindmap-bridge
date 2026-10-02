import manifest from '../manifest.json';
import pkg from '../package.json';
import versions from '../versions.json';

describe('release metadata', () => {
	it('keeps the plugin id the bridge is published under', () => {
		expect(manifest.id).toBe('annoteca-mindmap-bridge');
	});

	it('records the current version in versions.json', () => {
		const byVersion: Record<string, string> = versions;
		expect(byVersion[manifest.version]).toBe(manifest.minAppVersion);
	});

	it('matches package.json', () => {
		expect(pkg.version).toBe(manifest.version);
	});

	it('runs on mobile, as both bridged plugins do', () => {
		expect(manifest.isDesktopOnly).toBe(false);
	});
});

import {
	defaultSettings,
	filterActive,
	filterSummary,
	normalizeSettings,
	showsComment,
} from '../settings';
import type { BridgeSettings } from '../settings';
import { commentAt, NOTE } from './fixtures';

const open = commentAt(NOTE, '<!-- annoteca/clarify', { category: 'clarify' });
const resolved = commentAt(NOTE, '<!-- annoteca/tone', {
	category: 'tone',
	resolved: true,
});
const addressed = commentAt(NOTE, '<!-- annoteca/cut', {
	category: 'cut',
	addressed: true,
});

function settings(over: Partial<BridgeSettings>): BridgeSettings {
	return { ...defaultSettings(), ...over };
}

describe('normalizeSettings', () => {
	it('falls back to the defaults for missing or malformed data', () => {
		expect(normalizeSettings(undefined)).toEqual(defaultSettings());
		expect(normalizeSettings('junk')).toEqual(defaultSettings());
		expect(
			normalizeSettings({
				show: 'everything',
				tint: 'yes',
				hiddenCategories: 'x',
			}),
		).toEqual(defaultSettings());
	});

	it('keeps each well-formed field and cleans the category list', () => {
		expect(
			normalizeSettings({
				show: 'open',
				tint: true,
				hiddenCategories: ['tone', 'tone', '', 7, 'cut'],
			}),
		).toEqual({
			show: 'open',
			tint: true,
			hiddenCategories: ['tone', 'cut'],
		});
	});

	it('hands out a fresh default each time', () => {
		const a = defaultSettings();
		a.hiddenCategories.push('tone');
		expect(defaultSettings().hiddenCategories).toEqual([]);
	});
});

describe('showsComment', () => {
	it.each([
		['all', [true, true, true]],
		['open', [true, false, true]],
		['addressed', [false, false, true]],
	] as const)('show %s', (show, expected) => {
		const s = settings({ show });
		expect(
			[open, resolved, addressed].map((c) => showsComment(s, c)),
		).toEqual(expected);
	});

	it('leaves out hidden categories whatever the status', () => {
		const s = settings({ hiddenCategories: ['clarify'] });
		expect(showsComment(s, open)).toBe(false);
		expect(showsComment(s, resolved)).toBe(true);
	});

	it('does not count a resolved comment as awaiting review', () => {
		const s = settings({ show: 'addressed' });
		expect(showsComment(s, { ...addressed, resolved: true })).toBe(false);
	});
});

describe('filterActive and filterSummary', () => {
	const cats = ['tone', 'clarify', 'cut'];

	it('says nothing when the badges show everything', () => {
		expect(filterActive(defaultSettings())).toBe(false);
		expect(filterSummary(defaultSettings(), cats)).toBeNull();
	});

	it('names the status filter', () => {
		expect(filterSummary(settings({ show: 'open' }), cats)).toBe(
			'Badges show open comments only.',
		);
		expect(filterSummary(settings({ show: 'addressed' }), cats)).toBe(
			'Badges show comments awaiting review only.',
		);
	});

	it('counts hidden categories Annoteca still has, and only those', () => {
		const s = settings({ hiddenCategories: ['tone', 'gone'] });
		expect(filterActive(s)).toBe(true);
		expect(filterSummary(s, cats)).toBe(
			'Badges show all comments, in 2 of 3 categories.',
		);
		// A hidden id Annoteca no longer has filters nothing.
		expect(
			filterSummary(settings({ hiddenCategories: ['gone'] }), cats),
		).toBeNull();
	});
});

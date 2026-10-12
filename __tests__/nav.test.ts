import { stepTo } from '../nav';

describe('stepTo', () => {
	const lines = [12, 3, 7, 7];

	it('starts at the top going forward and the bottom going back', () => {
		expect(stepTo(lines, null, 1)).toBe(3);
		expect(stepTo(lines, null, -1)).toBe(12);
	});

	it('moves to the nearest badged line in that direction', () => {
		expect(stepTo(lines, 3, 1)).toBe(7);
		expect(stepTo(lines, 5, 1)).toBe(7);
		expect(stepTo(lines, 12, -1)).toBe(7);
		expect(stepTo(lines, 8, -1)).toBe(7);
	});

	it('wraps at either end', () => {
		expect(stepTo(lines, 12, 1)).toBe(3);
		expect(stepTo(lines, 3, -1)).toBe(12);
	});

	it('stays on a lone badge and finds nothing on an empty map', () => {
		expect(stepTo([4], 4, 1)).toBe(4);
		expect(stepTo([], null, 1)).toBeUndefined();
		expect(stepTo([], 2, -1)).toBeUndefined();
	});
});

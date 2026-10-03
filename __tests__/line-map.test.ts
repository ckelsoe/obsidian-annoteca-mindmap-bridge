import { lineAt, lineOwners, lineStarts } from '../line-map';
import { defined } from './helpers/checked';

describe('lineStarts and lineAt', () => {
	const text = 'zero\none\n\nthree';
	const starts = lineStarts(text);

	it('starts a line after every newline', () => {
		expect(starts).toEqual([0, 5, 9, 10]);
	});

	it('puts each offset on the line that holds it', () => {
		expect(lineAt(starts, 0)).toBe(0);
		expect(lineAt(starts, 4)).toBe(0);
		expect(lineAt(starts, 5)).toBe(1);
		expect(lineAt(starts, 9)).toBe(2);
		expect(lineAt(starts, 10)).toBe(3);
		expect(lineAt(starts, 14)).toBe(3);
	});

	it('keeps an offset past the end on the last line', () => {
		expect(lineAt(starts, 99)).toBe(3);
	});
});

describe('lineOwners', () => {
	const root = { name: 'root', line: -1, bodyLines: [1] };
	const heading = { name: 'heading', line: 2, bodyLines: [6] };
	const item = { name: 'item', line: 3, bodyLines: [] };
	const collapsed = { name: 'collapsed', line: 7, bodyLines: [] };
	const ownerOf = lineOwners([collapsed, item, heading, root]);

	it('gives a node its own line, drawn', () => {
		const owner = defined(ownerOf(3));
		expect(owner.node).toBe(item);
		expect(owner.drawn).toBe(true);
	});

	it('gives a node a body line it draws, even below a later node', () => {
		// Line 6 is the heading's text after the item's branch ends: the
		// nearest node above it is the item, but the map draws it in the
		// heading.
		const owner = defined(ownerOf(6));
		expect(owner.node).toBe(heading);
		expect(owner.drawn).toBe(true);
	});

	it('gives an undrawn line to the nearest node above it', () => {
		const owner = defined(ownerOf(5));
		expect(owner.node).toBe(item);
		expect(owner.drawn).toBe(false);
	});

	it('gives a collapsed node the lines of its hidden branch', () => {
		for (const line of [8, 9, 12]) {
			const owner = defined(ownerOf(line));
			expect(owner.node).toBe(collapsed);
			expect(owner.drawn).toBe(false);
		}
	});

	it('gives text above the first heading to the root', () => {
		expect(defined(ownerOf(0)).node).toBe(root);
		expect(defined(ownerOf(1))).toEqual({ node: root, drawn: true });
	});

	it('owns nothing when no node is at or above the line', () => {
		const noRoot = lineOwners([item]);
		expect(noRoot(0)).toBeUndefined();
	});
});

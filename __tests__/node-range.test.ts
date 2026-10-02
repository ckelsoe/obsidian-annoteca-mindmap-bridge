import { commentSpans, composeRange } from '../node-range';
import { defined } from './helpers/checked';

// The text a range covers, so each case reads as the words it selects.
function covered(text: string, line: number): string | null {
	const range = composeRange(text, line);
	return range ? text.slice(range.start, range.end) : null;
}

describe('composeRange', () => {
	it('covers a heading without its hashes', () => {
		expect(covered('# Release plan', 0)).toBe('Release plan');
	});

	it('covers a list item without its bullet, on its own line', () => {
		const text = 'intro\n- first\n  - nested item  \n- last';
		expect(covered(text, 2)).toBe('nested item');
		const range = defined(composeRange(text, 2));
		expect(range.start).toBe(text.indexOf('nested'));
	});

	it('covers a task without its checkbox, and a numbered item', () => {
		expect(covered('- [x] done thing', 0)).toBe('done thing');
		expect(covered('12. twelfth', 0)).toBe('twelfth');
	});

	it('covers a quoted line without the quote marks', () => {
		expect(covered('> > deep quote', 0)).toBe('deep quote');
	});

	it('skips a comment marker the text starts with, and stops at its closer', () => {
		const text =
			'- <!-- annoteca/clarify: [id=a] -->review steps<!-- /annoteca a -->';
		expect(covered(text, 0)).toBe('review steps');
	});

	it('stops before a comment inside the line', () => {
		expect(covered('Closing <!-- annoteca/cut: [id=c] --> words', 0)).toBe(
			'Closing',
		);
	});

	it('steps over the tail of a marker opened on an earlier line', () => {
		const text = '- <!-- annoteca/tone: long\n[id=b]\n--> check the tags';
		expect(covered(text, 2)).toBe('check the tags');
	});

	it('has nothing to cover on a line that is only markup or comment', () => {
		expect(composeRange('- \n# ', 0)).toBeNull();
		expect(composeRange('<!-- annoteca/cut: x -->', 0)).toBeNull();
		expect(composeRange('- <!-- annoteca/tone: still open', 0)).toBeNull();
	});

	it('has nothing for the root or a line past the end', () => {
		expect(composeRange('# a', -1)).toBeNull();
		expect(composeRange('# a\n- b', 5)).toBeNull();
	});
});

describe('commentSpans', () => {
	it('finds whole, unclosed and dangling comment syntax', () => {
		const line = 'tail --> mid <!-- a --> end <!-- open';
		expect(commentSpans(line)).toEqual([
			{ start: 0, end: 8 },
			{ start: 13, end: 23 },
			{ start: 28, end: line.length },
		]);
	});
});

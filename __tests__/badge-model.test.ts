import { badgesFor, tintLevel } from '../badge-model';
import { commentAt, NOTE } from './fixtures';
import { at, defined } from './helpers/checked';

const root = { line: -1, bodyLines: [] };
const plan = { line: 0, bodyLines: [4] };
const review = { line: 1, bodyLines: [] };
const ship = { line: 3, bodyLines: [] };

describe('badgesFor', () => {
	it('counts open and resolved comments on the node holding each marker', () => {
		const comments = [
			commentAt(NOTE, '<!-- annoteca/clarify', { category: 'clarify' }),
			commentAt(NOTE, '<!-- annoteca/cut', {
				category: 'cut',
				resolved: true,
			}),
		];
		const badges = badgesFor([root, plan, review, ship], comments, NOTE);
		const onReview = defined(badges.get(review));
		expect(onReview.open).toBe(1);
		expect(onReview.resolved).toBe(0);
		// Line 4 is drawn as the heading's body text.
		const onPlan = defined(badges.get(plan));
		expect(onPlan.open).toBe(0);
		expect(onPlan.resolved).toBe(1);
		expect(onPlan.hidden).toBe(0);
		expect(badges.has(ship)).toBe(false);
		expect(badges.has(root)).toBe(false);
	});

	it('colours by the first open comment in note order', () => {
		// Passed out of note order, and the first in the note is resolved.
		const tone = commentAt(NOTE, '<!-- annoteca/tone', {
			category: 'tone',
		});
		const clarify = commentAt(NOTE, '<!-- annoteca/clarify', {
			category: 'clarify',
			resolved: true,
		});
		const badge = defined(
			badgesFor([review], [tone, clarify], NOTE).get(review),
		);
		expect(badge.category).toBe('tone');
		expect(at(badge.comments, 0).comment).toBe(clarify);
		expect(at(badge.comments, 1).comment).toBe(tone);
	});

	it('colours by the first comment when every one is resolved', () => {
		const first = commentAt(NOTE, '<!-- annoteca/clarify', {
			category: 'clarify',
			resolved: true,
		});
		const second = commentAt(NOTE, '<!-- annoteca/tone', {
			category: 'tone',
			resolved: true,
		});
		const badge = defined(
			badgesFor([review], [second, first], NOTE).get(review),
		);
		expect(badge.category).toBe('clarify');
	});

	it('counts a collapsed branch on the collapsed node, as hidden', () => {
		// The child item on line 2 is not drawn: its parent is collapsed.
		const child = commentAt(NOTE, '<!-- annoteca/tone');
		const badge = defined(
			badgesFor([plan, review, ship], [child], NOTE).get(review),
		);
		expect(badge.open).toBe(1);
		expect(badge.hidden).toBe(1);
		expect(at(badge.comments, 0).drawn).toBe(false);
	});
});

describe('tintLevel', () => {
	it.each([
		[0, 0],
		[1, 1],
		[2, 2],
		[3, 2],
		[4, 3],
		[40, 3],
	])('%i open comments tint at level %i', (open, level) => {
		expect(tintLevel(open)).toBe(level);
	});
});

// The rows the bridge shows above a map (the storage notice, the filter
// row). Each is its own row in front of the view content, never inside the
// map's own elements, and they keep a fixed order whichever is drawn first.

const BAR_CLASS = 'annoteca-mmb-bar';

// A row of this kind in front of `anchor`, or null.
export function findBar(anchor: HTMLElement, cls: string): HTMLElement | null {
	const parent = anchor.parentElement;
	if (!parent) return null;
	for (const child of Array.from(parent.children))
		if (child.instanceOf(HTMLElement) && child.hasClass(cls)) return child;
	return null;
}

// A new, empty row of this kind in front of `anchor`, placed after every
// row with a lower `order` and before every row with a higher one.
export function placeBar(
	anchor: HTMLElement,
	cls: string,
	order: number,
): HTMLElement | null {
	const parent = anchor.parentElement;
	if (!parent) return null;
	const bar = parent.createDiv({
		cls: [BAR_CLASS, cls],
		attr: { role: 'status' },
	});
	bar.dataset.annotecaMmbOrder = String(order);
	let before: Element = anchor;
	for (const child of Array.from(parent.children)) {
		if (child === bar || !child.instanceOf(HTMLElement)) continue;
		if (!child.hasClass(BAR_CLASS)) continue;
		if (Number(child.dataset.annotecaMmbOrder) > order) {
			before = child;
			break;
		}
	}
	parent.insertBefore(bar, before);
	return bar;
}

// Minimal stand-in for the `obsidian` module under Jest, which has no plugin
// host. Production code type-checks against the real obsidian.d.ts, so this
// file only has to provide the runtime values the code under test touches.
// Test-only helpers are module-level exports reached through a relative
// import ('../__mocks__/obsidian'), never members added to a mocked class,
// so nothing here can make production code compile that would not build.

export class Plugin {}
export class PluginSettingTab {}
export class TFile {}
export class MarkdownView {}

// A menu item as the code under test builds it.
export class MenuItem {
	title = '';
	disabled = false;
	click: (() => void) | null = null;
	setTitle(title: string): this {
		this.title = title;
		return this;
	}
	setDisabled(disabled: boolean): this {
		this.disabled = disabled;
		return this;
	}
	onClick(cb: () => void): this {
		this.click = cb;
		return this;
	}
}

// Every menu shown during a test, oldest first. Clear it in beforeEach.
export const menuLog: Menu[] = [];

export class Menu {
	items: MenuItem[] = [];
	shownIn: Document | null = null;
	addItem(cb: (item: MenuItem) => unknown): this {
		const item = new MenuItem();
		cb(item);
		this.items.push(item);
		return this;
	}
	showAtPosition(_position: { x: number; y: number }, doc?: Document): this {
		this.shownIn = doc ?? null;
		menuLog.push(this);
		return this;
	}
}

// Every Notice raised during a test, oldest first. Clear it in beforeEach.
export const noticeLog: string[] = [];

export class Notice {
	constructor(message?: string) {
		noticeLog.push(message ?? '');
	}
}

// How often any debounced function was called, and how often one actually ran.
// Reset in beforeEach.
export const debounceStats = { calls: 0, runs: 0 };

// Obsidian's debounce, run without a timer: a call is recorded and runs only
// when the test calls the debouncer's `run()`. The shape matches the real
// Debouncer (callable, with cancel and run).
export function debounce<T extends unknown[]>(
	cb: (...args: T) => unknown,
): ((...args: T) => void) & { cancel(): void; run(): void } {
	let pending: T | null = null;
	const fn = (...args: T): void => {
		debounceStats.calls += 1;
		pending = args;
	};
	fn.cancel = (): void => {
		pending = null;
	};
	fn.run = (): void => {
		const args = pending;
		pending = null;
		if (!args) return;
		debounceStats.runs += 1;
		cb(...args);
	};
	return fn;
}

// Obsidian's DOM helpers, installed into a jsdom window. Pass a pop-out's
// window (an iframe's contentWindow) to install them in that realm too.
//
// Elements are cloned from seeds in the test's html (`#seeds`, one child per
// tag), never built with `createElement`: the code under test is what
// Obsidian's createEl replaces, and these helpers stand in for it.
// The constructors a window carries for its own realm.
interface Realm extends Window {
	readonly Node: typeof Node;
	readonly Element: typeof Element;
}

export function installObsidianDomHelpers(win: Window = window): void {
	const realm = win as Realm;
	const seeds = collectSeeds();

	function clone<K extends keyof HTMLElementTagNameMap>(
		doc: Document,
		tag: K,
	): HTMLElementTagNameMap[K] {
		const seed = seeds.get(tag);
		if (!seed)
			throw new Error(
				`no <${tag}> seed in #seeds; add one to the test html`,
			);
		// importNode gives a copy owned by `doc`, so an element made inside a
		// pop-out belongs to the pop-out's realm, as it would in Obsidian.
		return doc.importNode(seed, false) as HTMLElementTagNameMap[K];
	}

	function apply(el: HTMLElement, o?: DomElementInfo | string): void {
		if (o === undefined) return;
		if (typeof o === 'string') {
			el.className = o;
			return;
		}
		if (o.cls !== undefined) {
			const classes = Array.isArray(o.cls) ? o.cls : o.cls.split(/\s+/);
			for (const c of classes) if (c !== '') el.classList.add(c);
		}
		if (typeof o.text === 'string') el.textContent = o.text;
		for (const [k, v] of Object.entries(o.attr ?? {})) {
			if (v === null) el.removeAttribute(k);
			else el.setAttribute(k, String(v));
		}
	}

	function create<K extends keyof HTMLElementTagNameMap>(
		parent: Node,
		tag: K,
		o?: DomElementInfo | string,
	): HTMLElementTagNameMap[K] {
		const doc = parent.ownerDocument ?? realm.document;
		const el = clone(doc, tag);
		apply(el, o);
		parent.appendChild(el);
		return el;
	}

	const node = realm.Node.prototype;
	const element = realm.Element.prototype;
	node.createEl = function <K extends keyof HTMLElementTagNameMap>(
		this: Node,
		tag: K,
		o?: DomElementInfo | string,
	): HTMLElementTagNameMap[K] {
		return create(this, tag, o);
	};
	node.createDiv = function (
		this: Node,
		o?: DomElementInfo | string,
	): HTMLDivElement {
		return create(this, 'div', o);
	};
	node.createSpan = function (
		this: Node,
		o?: DomElementInfo | string,
	): HTMLSpanElement {
		return create(this, 'span', o);
	};
	// Obsidian's cross-window instanceOf: true for an element of that NAME
	// from any window, which is the point of it.
	node.instanceOf = function <T>(this: Node, type: new () => T): this is T {
		for (
			let proto: object | null = Object.getPrototypeOf(this) as
				object | null;
			proto;
			proto = Object.getPrototypeOf(proto) as object | null
		) {
			const ctor = (proto as { constructor?: { name?: string } })
				.constructor;
			if (ctor?.name === type.name) return true;
		}
		return false;
	};
	Object.defineProperty(node, 'win', {
		get(this: Node): Window {
			const doc = this.ownerDocument ?? realm.document;
			return doc.defaultView ?? realm;
		},
		configurable: true,
	});
	Object.defineProperty(node, 'doc', {
		get(this: Node): Document {
			return this.ownerDocument ?? realm.document;
		},
		configurable: true,
	});
	element.hasClass = function (this: Element, cls: string): boolean {
		return this.classList.contains(cls);
	};
	element.addClass = function (this: Element, ...classes: string[]): void {
		for (const c of classes) if (c !== '') this.classList.add(c);
	};
	element.toggleClass = function (
		this: Element,
		classes: string | string[],
		value: boolean,
	): void {
		for (const c of Array.isArray(classes) ? classes : [classes])
			if (c !== '') this.classList.toggle(c, value);
	};
	element.empty = function (this: Element): void {
		this.replaceChildren();
	};
	element.setText = function (this: Element, text: string): void {
		this.textContent = text;
	};
}

let seedCache: Map<string, Element> | null = null;

function collectSeeds(): Map<string, Element> {
	if (seedCache) return seedCache;
	const root = document.getElementById('seeds');
	if (!root)
		throw new Error(
			'installObsidianDomHelpers needs a #seeds element in the jsdom html option',
		);
	const seeds = new Map<string, Element>();
	for (const el of Array.from(root.children))
		seeds.set(el.tagName.toLowerCase(), el);
	// The seeds are scaffolding, not part of any test's DOM.
	root.remove();
	seedCache = seeds;
	return seeds;
}

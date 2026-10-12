// Annoteca, reached only through its public plugin API. Resolved at every
// call, never cached at load: caching is what makes plugin load order matter,
// and Annoteca can be disabled, updated or enabled while the bridge runs.

import type { App } from 'obsidian';
import type { AnnotecaApi } from './annoteca-api';

// apiVersion 5 adds compose(); everything else the bridge needs is older.
// resolve() and reopen() (7) are optional; see canResolve below.
const MIN_API_VERSION = 5;

export type AnnotecaStatus =
	| { readonly kind: 'ready'; readonly api: AnnotecaApi }
	| { readonly kind: 'missing' }
	| { readonly kind: 'outdated' };

const METHODS = [
	'categories',
	'queryComments',
	'reveal',
	'compose',
	'onChange',
] as const;

function isApi(value: unknown): value is AnnotecaApi {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.apiVersion !== 'number') return false;
	return METHODS.every((name) => typeof candidate[name] === 'function');
}

// apiVersion 7 adds resolve() and reopen(). Optional: below it the badge menu
// opens comments but offers no Resolve or Reopen.
const RESOLVE_API_VERSION = 7;

export function canResolve(api: AnnotecaApi): boolean {
	// Feature-detected as well: the declared type says the methods are there,
	// but an older Annoteca at runtime does not have them.
	const methods = api as unknown as Record<string, unknown>;
	return (
		api.apiVersion >= RESOLVE_API_VERSION &&
		typeof methods.resolve === 'function' &&
		typeof methods.reopen === 'function'
	);
}

export function annotecaStatus(app: App): AnnotecaStatus {
	const plugin = app.plugins.getPlugin('annoteca');
	if (!plugin) return { kind: 'missing' };
	const api = plugin.api;
	// Feature-detect the methods as well as the level: a build can report an
	// older number while carrying a method, and the reverse would be a bug.
	if (!isApi(api) || api.apiVersion < MIN_API_VERSION)
		return { kind: 'outdated' };
	return { kind: 'ready', api };
}

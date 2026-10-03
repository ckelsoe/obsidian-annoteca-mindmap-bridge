# Copilot instructions for obsidian-annoteca-mindmap-bridge

## What this repository is

An [Obsidian](https://obsidian.md) community plugin (TypeScript, Node 22, esbuild bundle) that connects two other plugins from the outside:

- **Annoteca** (`annoteca`), reached only through its public, versioned plugin API at `app.plugins.getPlugin('annoteca')?.api`. The API is resolved at call time, never cached at load, and gated on `apiVersion >= 5`.
- **Mind map editor** (`mindmap-editor`, by vulture039), reached only through its view's DOM and view state. Every assumption about that plugin lives in `adapters/mindmap-editor.ts`. Nothing else in the code may name its classes, attributes or view type.

The bridge never writes to a note itself. It draws badges, opens comments through `api.reveal`, asks Annoteca to open its own comment form through `api.compose`, and runs Annoteca's storage conversion command only when the user presses a button.

## Build, lint, test

```bash
npm run build   # tsc type-check + esbuild bundle
npm run lint    # eslint (obsidianmd + typescript-eslint type-checked + curated sonarjs), prettier --check, submission pre-check, marketplace type-check
npm test        # Jest
```

All three must pass. `npm run lint` must report zero warnings.

## Hard rules

- Never `eslint-disable` any rule, inline or in config. Fix the code.
- No `as any`. No non-null assertions (`x!`); tests use `at()` / `defined()` from `__tests__/helpers/checked.ts`.
- No inline styles. All CSS lives in `styles.css`, scoped under the bridge's own `annoteca-mmb-` classes. Never restyle Mind map editor's elements.
- The badge and "+" on a node are spans with `role="button"`, `tabindex="0"` and Enter/Space handling, not `<button>` elements. Themes restyle every `button` (size, padding, even `position`) with selectors the bridge cannot outrank. Do not change them back.
- The "+" is hidden with `opacity: 0` and `pointer-events: none`, not `visibility`, so it stays focusable.
- Pop-out windows: use the element's own `win` / `doc`, `instanceOf` rather than `instanceof` for DOM checks, and never the global `document` or `window`.
- Never throw into Mind map editor's view. When the adapter cannot read the map, the bridge shows nothing and reports a status line in its settings tab.
- Never resolve, edit or delete an Annoteca comment. The API does not allow it and the bridge must not work around that.
- Sentence case for UI strings. No em dashes in prose or comments.
- README is public: no CI or release internals, no links to private repos.

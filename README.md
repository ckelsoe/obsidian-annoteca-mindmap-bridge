# Annoteca MindMap Bridge

[![CI](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-annoteca-mindmap-bridge/ci.yml?branch=main&label=CI&logo=github)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-annoteca-mindmap-bridge/release.yml?label=Release&logo=github)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/actions/workflows/release.yml) [![GitHub Downloads](https://img.shields.io/github/downloads/ckelsoe/obsidian-annoteca-mindmap-bridge/total?logo=github&label=Downloads)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/releases) [![GitHub Stars](https://img.shields.io/github/stars/ckelsoe/obsidian-annoteca-mindmap-bridge?style=flat&logo=github&label=Stars)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge) [![Obsidian](https://img.shields.io/badge/Obsidian-v1.13.0%2B-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md) [![License](https://img.shields.io/github/license/ckelsoe/obsidian-annoteca-mindmap-bridge)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/blob/main/LICENSE) [![Latest Release](https://img.shields.io/github/v/release/ckelsoe/obsidian-annoteca-mindmap-bridge?label=Latest)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/releases/latest)

Shows Annoteca comment badges on Mind map editor nodes and lets you comment on a node.

This plugin connects two other plugins. You need both:

- [Annoteca](https://github.com/ckelsoe/obsidian-annoteca) 1.20.0 or later, for the comments.
- [Mind map editor](https://github.com/vulture039/obsidian-mindmap-editor) 1.8.1 or later, for the map (tested through 1.9.0).

Resolving and reopening comments from the map needs Annoteca 1.22.0 or later. Everything else works from 1.20.0.

It is not part of either plugin and not made by Mind map editor's author. It reads Mind map editor's map from the outside, so a future Mind map editor release can change what it reads. When that happens the badges switch off and the plugin's settings say so. Nothing in your notes is affected.

## What it does

- **Badges on nodes.** A node that holds Annoteca comments shows a small badge with the number of open comments, in the colour of the first open comment's category. When every comment there is resolved, the badge is dimmed. A collapsed node also counts the comments in its hidden branch.
- **Act on comments from the map.** Click a badge to list the node's comments (category and first words). Choose a comment to open it in Annoteca. Each has **Resolve** (or **Reopen** once resolved) right under it, which works exactly as resolving in Annoteca does, including its "delete on resolve" setting. A comment with a proposed edit waiting shows **Review the proposed edit** instead, which opens it in Annoteca to accept, revise or reject.
- **Filter the badges.** Show all comments, open ones only, or only those awaiting review, and turn categories off. While a filter is on, a row above the map says what is filtered, with a **Clear filter** button, so a missing badge is never mistaken for "no comments".
- **Go from comment to comment.** "Go to next node with comments" and "Go to previous node with comments" select the next badged node on the map in line order, scroll to it, and wrap at the ends. Give them hotkeys to review a long document node by node.
- **Tint (optional).** Shade each node by how many open comments it holds: one, two or three, or four and more. Off by default.
- **Comment on a node.** Point at a node and press its **+**. Annoteca's own comment form opens with exactly that node's text selected. Nothing is written until you save there. On a touch screen, tap a node to select it, and its **+** shows.
- **Storage notice.** If the note's comments use Annoteca's inline storage, a notice above the map offers to convert the note to end-of-file storage (see below). It never converts a note unless you press the button.

Both controls on a node work from the keyboard (Tab to them, then Enter or Space).

If **+** says the map has not caught up with your latest edits, wait a moment and press it again: it refuses rather than comment on the wrong line while the map redraws. If it says it could not tell which text the node shows, comment on that text from the note instead.

## Settings

- **Show**: which comments the badges count. All comments, open only, or awaiting review.
- **Categories**: one switch per Annoteca category. Turn one off to leave its comments off the map.
- **Tint nodes by open comments**: off by default.
- **Status**: whether Annoteca and Mind map editor are connected, and whether your Annoteca can resolve comments from the map.

## Commands

- **Filter comment badges**: pick what the badges show (all, open only, awaiting review).
- **Go to next node with comments** and **Go to previous node with comments**: available while a mind map is the active view.

## Why the storage notice matters

Annoteca's inline storage writes a comment, with its thread and details, across several lines inside the note. Mind map editor edits a note line by line. Moving or deleting a node on the map moves only the first line of such a comment and leaves the rest behind, which damages the comment.

Annoteca's end-of-file storage keeps a one-line marker in the text and the rest of the comment in a store at the end of the note. A node then carries its whole marker with it when you move it. The notice's button runs Annoteca's own "Convert this note to end-of-file comment storage" command on that note. Annoteca can also convert every note in the vault at once from its commands. To make end-of-file storage the default for new comments, change Annoteca's storage setting. That setting, and the per-note `annoteca_storage` property, only affect new comments; a note's existing comments change style only when it is converted.

One thing to know with end-of-file storage: the map shows the store as text of the note's last section. If you drag that last section somewhere else on the map, the store moves with it and is no longer at the end of the note. Annoteca still reads the comments, but keep that section last if you can.

## Requirements

- Obsidian 1.13.0 or later, desktop or mobile.
- Annoteca 1.20.0 or later (its plugin API version 5). Resolving and reopening from the map needs Annoteca 1.22.0 or later (API version 7).
- Mind map editor 1.8.1 or later, tested through 1.9.0.

If Annoteca is missing or too old, the plugin says so once and shows nothing on the map.

## Installation

### BRAT

1. Install the **BRAT** plugin from Community Plugins.
2. Open BRAT settings and click **Add Beta Plugin**.
3. Enter: `https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge`
4. Enable **Annoteca MindMap Bridge** in Settings → Community plugins.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/releases/latest).
2. Create a folder named `annoteca-mindmap-bridge` in your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into this folder.
4. Reload Obsidian.
5. Enable **Annoteca MindMap Bridge** in Settings → Community plugins.

## Privacy

The plugin makes no network requests and never writes to your notes itself: creating, resolving and reopening a comment all go through Annoteca, and only when you press the button. See [PRIVACY.md](./PRIVACY.md).

## Community

Questions, ideas, and general discussion happen on [Discord](https://discord.gg/gd6tKJDPj4). For anything that needs tracking, a [GitHub issue](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/issues) is still the better home.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, quality gates, and conventions.

## License

MIT. See [LICENSE](./LICENSE).

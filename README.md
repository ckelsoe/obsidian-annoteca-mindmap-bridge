# Annoteca MindMap Bridge

[![CI](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-annoteca-mindmap-bridge/ci.yml?branch=main&label=CI&logo=github)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/actions/workflow/status/ckelsoe/obsidian-annoteca-mindmap-bridge/release.yml?label=Release&logo=github)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/actions/workflows/release.yml) [![GitHub Downloads](https://img.shields.io/github/downloads/ckelsoe/obsidian-annoteca-mindmap-bridge/total?logo=github&label=Downloads)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/releases) [![GitHub Stars](https://img.shields.io/github/stars/ckelsoe/obsidian-annoteca-mindmap-bridge?style=flat&logo=github&label=Stars)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge) [![Obsidian](https://img.shields.io/badge/Obsidian-v1.13.0%2B-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md) [![License](https://img.shields.io/github/license/ckelsoe/obsidian-annoteca-mindmap-bridge)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/blob/main/LICENSE) [![Latest Release](https://img.shields.io/github/v/release/ckelsoe/obsidian-annoteca-mindmap-bridge?label=Latest)](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/releases/latest)

Shows Annoteca comment badges on Mind map editor nodes and lets you comment on a node.

This plugin connects two other plugins. You need both:

- [Annoteca](https://github.com/ckelsoe/obsidian-annoteca) 1.20.0 or later, for the comments.
- [Mind map editor](https://github.com/vulture039/obsidian-mindmap-editor) 1.8.1 or later, for the map.

It is not part of either plugin and not made by Mind map editor's author. It reads Mind map editor's map from the outside, so a future Mind map editor release can change what it reads. When that happens the badges switch off and the plugin's settings say so. Nothing in your notes is affected.

## What it does

- **Badges on nodes.** A node that holds Annoteca comments shows a small badge with the number of open comments, in the colour of the first open comment's category. When every comment there is resolved, the badge is dimmed. A collapsed node also counts the comments in its hidden branch.
- **Open a comment from the map.** Click a badge to open its comment in Annoteca. A node with several comments shows a list (category and first words), and each opens its own.
- **Comment on a node.** Point at a node and press its **+**. Annoteca's own comment form opens with exactly that node's text selected. Nothing is written until you save there. On a touch screen, tap a node to select it, and its **+** shows.
- **Storage notice.** If the note's comments use Annoteca's inline storage, a notice above the map offers to convert the note to end-of-file storage (see below). It never converts a note unless you press the button.

Both controls on a node work from the keyboard (Tab to them, then Enter or Space).

## Why the storage notice matters

Annoteca's inline storage writes a comment, with its thread and details, across several lines inside the note. Mind map editor edits a note line by line. Moving or deleting a node on the map moves only the first line of such a comment and leaves the rest behind, which damages the comment.

Annoteca's end-of-file storage keeps a one-line marker in the text and the rest of the comment in a store at the end of the note. A node then carries its whole marker with it when you move it. The notice's button runs Annoteca's own "Convert this note to end-of-file comment storage" command on that note. Annoteca can also convert every note in the vault at once from its commands. To make end-of-file storage the default for new comments, change Annoteca's storage setting. That setting, and the per-note `annoteca_storage` property, only affect new comments; a note's existing comments change style only when it is converted.

One thing to know with end-of-file storage: the map shows the store as text of the note's last section. If you drag that last section somewhere else on the map, the store moves with it and is no longer at the end of the note. Annoteca still reads the comments, but keep that section last if you can.

## Requirements

- Obsidian 1.13.0 or later, desktop or mobile.
- Annoteca 1.20.0 or later (its plugin API version 5).
- Mind map editor 1.8.1 or later.

If Annoteca is missing or too old, the plugin says so once and shows nothing on the map.

## Installation

### BRAT (pre-release)

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

The plugin makes no network requests and never writes to your notes itself. See [PRIVACY.md](./PRIVACY.md).

## Community

Questions, ideas, and general discussion happen on [Discord](https://discord.gg/gd6tKJDPj4). For anything that needs tracking, a [GitHub issue](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/issues) is still the better home.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, quality gates, and conventions.

## License

MIT. See [LICENSE](./LICENSE).

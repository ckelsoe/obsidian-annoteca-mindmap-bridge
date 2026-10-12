# Privacy Policy

_Last updated: 2026-10-12_

This policy explains what the **Annoteca MindMap Bridge** Obsidian plugin ("the plugin") does and does not do with your data. It applies to the plugin as distributed through the Obsidian Community Plugins marketplace, GitHub releases, and BRAT.

## Summary

The plugin collects nothing, stores nothing outside your own vault, and sends nothing anywhere. It contains no network code.

## What the plugin does

The plugin connects two other plugins, Annoteca and Mind map editor, inside your vault.

- It reads the text of the note a mind map shows, and asks Annoteca (through Annoteca's public plugin API) for that note's comments. It uses both only to draw badges on the map.
- It never writes to a note itself. Creating a comment opens Annoteca's own comment form; nothing is written until you save there, and Annoteca does the writing.
- Resolve and Reopen in a badge's menu ask Annoteca to resolve or reopen that comment, through Annoteca's public plugin API. Annoteca makes the change in the note, exactly as if you had pressed Resolve or Reopen in Annoteca. The plugin does this only when you choose that menu item.
- When a note uses multi-line inline comment markers, the plugin shows a notice with a button. Only when you press that button does it run Annoteca's "Convert this note to end-of-file comment storage" command, which rewrites that one note.

## Data collection

- **No personal data is collected.** The plugin does not collect names, email addresses, file contents, usage statistics, or any other information.
- **No telemetry or analytics.** There is no tracking, crash reporting, or phone-home behavior of any kind.
- **No automatic background activity.** The plugin reads a note only while it is open in a mind map, and changes nothing unless you press one of its buttons or choose Resolve or Reopen.

## Data storage

- The plugin's settings (which comments the badges show, hidden categories, and whether nodes are tinted) are stored by Obsidian in your vault's local `data.json` file, on your own device. They never leave your device.
- Any other data the plugin reads or writes stays inside your vault, on your own device.

## Network use

The plugin contains **no network code**. It makes no HTTP requests, opens no sockets, and contacts no servers. Not the maintainer's, not Obsidian's, not any third party.

## Third parties

The plugin shares no data with any third party. It has no data to share and no means to transmit it.

## Disclaimer of liability

The plugin is provided free of charge, "AS IS", without warranty of any kind, as set out in the [MIT License](./LICENSE). To the maximum extent permitted by law, the maintainer is not liable for any loss, damage, or claim arising from use of the plugin.

## Information you choose to share

If you open a GitHub issue, discussion, or pull request, anything you paste there (file contents, screenshots, vault structure, system details) becomes **public**. The maintainer does not request this information and is not responsible for content you choose to post. Review and redact anything sensitive before submitting. To report a security vulnerability privately instead, see [SECURITY.md](./SECURITY.md).

## Changes to this policy

This policy may be updated as the plugin evolves. Material changes will be noted in [CHANGELOG.md](./CHANGELOG.md). The "last updated" date above reflects the current version.

## Contact

Questions about this policy: open an issue at [github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/issues](https://github.com/ckelsoe/obsidian-annoteca-mindmap-bridge/issues). Do not use a public issue for security vulnerabilities; see [SECURITY.md](./SECURITY.md) for the private reporting channel.

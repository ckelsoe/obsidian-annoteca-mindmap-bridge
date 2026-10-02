# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comment badges on Mind map editor nodes. Each node that holds Annoteca comments shows the open count, coloured by the first open comment's category, and dimmed when every comment there is resolved. A collapsed node also counts the comments in its hidden branch.
- Badges follow the map: they come back when the map redraws, and update when comments change in Annoteca or the note changes.
- Click a badge to open its comment in Annoteca. A node with several comments lists them (category and first words) and each opens its own.
- A "+" on each node starts an Annoteca comment on exactly that node's text, in Annoteca's own form. It shows when you point at a node, and always on the selected node, so it works on touch screens. Both controls work from the keyboard.
- A status section in the plugin's settings shows whether Annoteca and Mind map editor are connected.

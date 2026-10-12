# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-12

The first stable release. Act on comments from the map: resolve and reopen them, filter what the badges show, step from comment to comment, and tint nodes by open comments. Needs Annoteca 1.20.0 or later (1.22.0 or later to resolve from the map) and Mind map editor 1.8.1 or later.

### Added
- **Resolve and Reopen from the map.** A badge now always opens a menu of its node's comments, even when there is only one. Each comment has Resolve, or Reopen once it is resolved, which Annoteca carries out exactly as its own button does, including "delete on resolve". A comment with a proposed edit waiting offers "Review the proposed edit" instead, which opens it in Annoteca. Needs Annoteca 1.22.0 or later; with an older Annoteca the menu only opens comments, and the settings say so.
- **Badge filters**, the plugin's first settings. Show all comments, open ones only, or only those awaiting review, and turn categories off one by one. While a filter is on, a row above the map says what is filtered and has a Clear filter button. The "Filter comment badges" command picks the status filter.
- **Go to next/previous node with comments**: two commands that select the next badged node on the map in line order, scroll to it, and wrap at the ends. They follow the filter.
- **Tint nodes by open comments** (off by default): shades each node by how many open comments it holds, one, two or three, or four and more.

### Changed
- The badge's click opens the menu even for a single comment, where it used to open the comment straight away.
- Checked against Mind map editor 1.9.0. Its new node toolbar sits above a node, clear of the badge and "+".

## [0.1.0-beta.1] - 2026-10-03

First beta. Needs Annoteca 1.20.0 or later and Mind map editor 1.8.1 or later.

### Added

- Comment badges on Mind map editor nodes. Each node that holds Annoteca comments shows the open count, coloured by the first open comment's category, and dimmed when every comment there is resolved. A collapsed node also counts the comments in its hidden branch.
- Badges follow the map: they come back when the map redraws, and update when comments change in Annoteca or the note changes.
- Click a badge to open its comment in Annoteca. A node with several comments lists them (category and first words) and each opens its own.
- A "+" on each node starts an Annoteca comment on exactly that node's text, in Annoteca's own form. It shows when you point at a node, and always on the selected node, so it works on touch screens. Both controls work from the keyboard.
- A notice above the map when the note's Annoteca comments are stored across several lines (Annoteca's inline storage), which moving nodes on the map can split. Its button converts the note to Annoteca's end-of-file storage, which keeps each comment on one line. Nothing is converted unless you press it; "Not now" hides it for the session.
- A status section in the plugin's settings shows whether Annoteca and Mind map editor are connected.

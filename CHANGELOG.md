# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, adapted for this repository.

## [2.1.0] - 2026-03-14

### Changed

- Updated extension manifest to `v2.1.0`
- Synced the latest `content.js` from the `v2.1.0` mainline package
- Updated remote release metadata in `version.json`

### Notes

- GitHub-based update check support remains enabled in this release

## [2.0.10] - 2026-03-14

### Added

- Built-in update check flow backed by remote `version.json`
- Background alarm-based automatic update polling
- Popup-side update status and release lookup support
- Repository-tracked `version.json` for release metadata

### Changed

- Updated extension manifest to `v2.0.10`
- Synced popup and background logic from the `mainline_updatecheck` package
- Refreshed content script alongside the update-check release

### Notes

- Public repository README layout was kept while merging the new package source

## [2.0.9] - 2026-03-14

### Changed

- Synced mainline package updates into the GitHub source branch
- Updated extension manifest to `v2.0.9`
- Added extension `key` to keep a stable extension identity across builds
- Refreshed `content.js` with the latest mainline implementation

### Notes

- Public repository documentation layout was retained while merging the new package source

## [2.0.8] - 2026-03-14

### Added

- Page-embedded PromptDock workflow for ChatGPT pages
- Prompt creation, editing, deletion, save, search, and favorites support
- JSON import/export and local backup workflow
- Floating entry, dock panel resizing, and panel position persistence

### Changed

- Refined panel layout and card action hierarchy
- Improved in-page prompt management flow and interaction structure

### Notes

- This is the first GitHub-tracked release for the repository

## Versioning Notes

- `PATCH` for bug fixes and small improvements
- `MINOR` for lightweight feature additions
- `MAJOR` for breaking changes or large architectural updates

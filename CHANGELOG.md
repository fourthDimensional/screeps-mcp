# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-07-13

### Changed

- Reorganized source code into a modular `src/` directory.
- Centralized configuration in `src/config.js` and a single reusable HTTP client in `src/client.js`.
- Split monolithic `index.js` into focused tool modules under `src/tools/`.
- Reorganized documentation into `docs/` and merged duplicated guides.
- Deleted account-specific `STATUS.md` and auto-drifting `PROJECT_STRUCTURE.md`.
- Added ESLint, Prettier, EditorConfig, and a `node:test` test suite.
- Updated `package.json` metadata and entry points to `src/index.js`.
- Started tracking `package-lock.json`.

## [1.1.0] - 2025-10-10

### Added

- Real-time console monitoring via WebSocket using `screeps-api`.
- In-memory console buffer (200 entries) for logs and command results.
- `clearBuffer` option on `get_console`.
- Shard parameter support for room and game time queries.

### Changed

- `get_console` now returns WebSocket logs when connected.
- `get_room_terrain`, `get_room_status`, and `get_game_time` accept a `shard` parameter.

### Fixed

- Console logs no longer return HTTP 404 when WebSocket is connected.

## [1.0.0] - 2025-10-10

### Added

- Initial MCP server implementation.
- 13 tools for Screeps interaction.
- Token and email/password authentication.
- Code upload, memory read/write, room queries, user info, and game time tools.
- Performance analysis, error detection, and troubleshooting tools.

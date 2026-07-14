# Screeps MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for [Screeps](https://screeps.com/). It exposes tools that let AI assistants upload bot code, monitor console output, execute commands, read and write memory, inspect rooms, and troubleshoot bot health.

## Features

- **Controlled deployment**: validate and upload complete module manifests, keep deployment records, and roll back only to a recorded target.
- **Console monitoring**: real-time logs via WebSocket when a token is provided.
- **Command execution**: run JavaScript in the Screeps console.
- **Memory management**: read and write bot memory paths.
- **Game state access**: room terrain, room status, game time, user info.
- **Documentation search**: full-text BM25 search over the Screeps guide, API reference, and game constants.
- **Evidence-driven diagnostics**: tick-correlated probes, compact snapshots, optional telemetry, local metric history, and explicit health verdicts.
- **Safety controls**: environment policy, structured results, and append-only audit records for mutations.

## Quick Start

```bash
npm install
cp .env.example .env
# edit .env and add your SCREEPS_TOKEN
npm test
npm start
```

See the full installation guide in [`docs/getting-started/installation.md`](docs/getting-started/installation.md).

## Documentation

- [Getting Started](docs/getting-started/installation.md) — install, configure, and verify the server.
- [Cursor Setup](docs/getting-started/cursor.md) — configure the MCP in Cursor.
- [API Reference](docs/reference/api.md) — Screeps endpoints, limitations, and tool details.
- [Compatibility](docs/reference/compatibility.md) — endpoint support and capability detection.
- [Tool Results](docs/reference/tool-results.md) — stable result envelope and errors.
- [Telemetry Contract](docs/reference/telemetry-contract.md) — optional bot telemetry.
- [Agent Playbook](docs/agent-playbook.md) — inspect, deploy, observe, compare, and rollback.
- [WebSocket Console](docs/reference/websocket.md) — how real-time console streaming works.
- [Contributing](docs/development/contributing.md) — adding new tools and project conventions.
- [Changelog](CHANGELOG.md)

## Configuration

The server reads environment variables from `.env` or the MCP client environment:

```env
SCREEPS_TOKEN=your_token_here
SCREEPS_SERVER=http://localhost:21025
SCREEPS_BRANCH=default
SCREEPS_ENVIRONMENT=development
```

Token authentication is recommended. Email/password authentication is also supported via `SCREEPS_EMAIL` and `SCREEPS_PASSWORD`.

## License

MIT

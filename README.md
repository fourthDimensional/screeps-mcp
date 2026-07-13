# Screeps MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for [Screeps](https://screeps.com/). It exposes tools that let AI assistants upload bot code, monitor console output, execute commands, read and write memory, inspect rooms, and troubleshoot bot health.

## Features

- **Code deployment**: upload `main.js` to any Screeps branch.
- **Console monitoring**: real-time logs via WebSocket when a token is provided.
- **Command execution**: run JavaScript in the Screeps console.
- **Memory management**: read and write bot memory paths.
- **Game state access**: room terrain, room status, game time, user info.
- **Diagnostics**: performance analysis, error scanning, and a comprehensive troubleshooting health check.

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
- [WebSocket Console](docs/reference/websocket.md) — how real-time console streaming works.
- [Contributing](docs/development/contributing.md) — adding new tools and project conventions.
- [Changelog](CHANGELOG.md)

## Configuration

The server reads environment variables from `.env` or the MCP client environment:

```env
SCREEPS_TOKEN=your_token_here
SCREEPS_SERVER=http://localhost:21025
SCREEPS_BRANCH=default
```

Token authentication is recommended. Email/password authentication is also supported via `SCREEPS_EMAIL` and `SCREEPS_PASSWORD`.

## License

MIT

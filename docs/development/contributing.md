# Contributing

Thanks for helping improve the Screeps MCP server.

## Project Layout

```
src/
├── index.js          # Entry point: wires config, websocket, and MCP server
├── config.js         # Environment variables and authentication
├── client.js         # Reusable axios Screeps client
├── server.js         # MCP server and tool registration
├── tools/            # Tool schemas and handlers
└── websocket/        # WebSocket connection and buffer management
```

## Adding a New Tool

1. Implement the public handler in `src/tools/<category>.js`, or keep its thin registration in `src/tools/dispatch.js` and put reusable domain/transport logic in `src/`.
2. Add the JSON schema to `src/tools/schemas.js`.
3. Register the handler in `src/tools/dispatch.js`.
4. Add a test in `tests/tools/` for public tool contracts; pure domain and transport units may live directly in `tests/`.
5. Document the tool in `docs/reference/api.md`.

## Code Style

- Run `npm run format` before committing.
- Run `npm run lint` and fix any issues.
- Keep tool response shapes consistent with existing tools.

## Tests

```bash
npm test          # unit tests
npm run smoke     # live connection test
```

## Scripts

```bash
npm start         # run the MCP server
npm run dev       # run with hot reload
npm run lint      # run ESLint
npm run lint:fix  # fix ESLint issues
npm run format    # format with Prettier
```

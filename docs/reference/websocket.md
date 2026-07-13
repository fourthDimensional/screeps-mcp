# WebSocket Console Streaming

The Screeps MCP server uses a persistent WebSocket connection to stream console logs in real time.

## How It Works

When the server starts, if `SCREEPS_TOKEN` is set, it connects to Screeps via the `screeps-api` library and subscribes to `console` events. Log and command-result messages are buffered in memory (last 200 entries) and returned by the `get_console` tool.

## Startup Sequence

1. Read `SCREEPS_TOKEN` from the environment.
2. Connect to Screeps WebSocket.
3. Subscribe to console messages.
4. Buffer logs and results.
5. Serve buffered console data via `get_console`.

## Using `get_console`

```text
Show me the console logs
```

When WebSocket is connected, the response includes:

```json
{
  "logs": ["bot tick 12345"],
  "results": [],
  "count": 1,
  "source": "websocket",
  "connectionStatus": "connected"
}
```

To clear the buffer and return only new logs:

```text
Show me the console logs and clear the buffer
```

## Error Handling

If WebSocket initialization fails, the MCP server keeps running in HTTP-only mode. `get_console` will return a note explaining that console logs are unavailable. All other tools continue to work.

## Buffer Management

- Maximum 200 log entries.
- Maximum 200 result entries.
- Old entries are discarded automatically.

## Requirements

- `SCREEPS_TOKEN` must be set (token authentication).
- An active internet connection to Screeps.

## Troubleshooting

- **"WebSocket initialization failed"**: verify `SCREEPS_TOKEN`, token expiration, and network access.
- **"Console logs empty"**: the bot may not be running yet. Wait a few game ticks.
- **"ConnectionStatus: disconnected"**: the connection may have dropped. Restart the MCP server.

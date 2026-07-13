# Screeps MCP Setup for Cursor

## Find Your Cursor MCP Config

Cursor stores MCP configurations in:

- **macOS**: `~/Library/Application Support/Cursor/mcp_config.json`
- **Windows**: `%APPDATA%\Cursor\mcp_config.json`
- **Linux**: `~/.cursor/mcp_config.json`

## Add Screeps MCP

Open the config file in your editor:

```bash
# macOS/Linux
nano ~/Library/Application\ Support/Cursor/mcp_config.json
```

If the file does not exist, create it with this content:

```json
{
  "mcpServers": {
    "screeps": {
      "command": "node",
      "args": ["/path/to/screeps-mcp/src/index.js"],
      "env": {
        "SCREEPS_TOKEN": "your_full_token_here",
        "SCREEPS_SERVER": "http://localhost:21025",
        "SCREEPS_BRANCH": "default"
      }
    }
  }
}
```

If the file already exists, add only the `"screeps"` section under `mcpServers`.

## Activate the MCP

1. Save the config file.
2. Reload Cursor:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type `Reload Window`
   - Press Enter

Or fully close and reopen Cursor.

## Test Commands

In the Cursor chat (`Ctrl+L` / `Cmd+L`), try:

```text
Show me my Screeps user info
What's the current Screeps game time?
Get my bot's memory
Get terrain for room W1N1
Upload my code at /path/to/main.js
```

You can also invoke the MCP explicitly in Composer (`Ctrl+I` / `Cmd+I`):

```text
@screeps show me my account info
```

## Troubleshooting

- **MCP not showing up**: verify the config path, JSON syntax, and absolute path to `src/index.js`.
- **Permission errors**: make sure `src/index.js` is executable, or use `node` as the command with the file as an argument.
- **Node not found**: run `which node` and use the full path in the config if needed.
- **Authentication errors**: regenerate your token and update the `SCREEPS_TOKEN` value.

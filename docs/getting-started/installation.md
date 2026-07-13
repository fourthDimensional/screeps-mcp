# Installation and Quick Start

Get the Screeps MCP server running in a few minutes.

## Prerequisites

- Node.js 18 or later
- npm
- A Screeps account at https://screeps.com
- An MCP-compatible client such as Claude Desktop or Cursor

## 1. Install Dependencies

```bash
cd screeps-mcp
npm install
```

## 2. Get a Screeps Auth Token

1. Log in to Screeps: https://screeps.com
2. Open Account Settings → Auth Tokens: https://screeps.com/a/#!/account/auth-tokens
3. Generate a new token named "MCP Server"
4. Select **Full Access** permission
5. Copy the token

Email and password authentication (`SCREEPS_EMAIL` and `SCREEPS_PASSWORD`) is also supported, but tokens are recommended.

## 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
SCREEPS_TOKEN=your_token_here
SCREEPS_SERVER=http://localhost:21025
SCREEPS_BRANCH=default
```

Do not add quotes around the token.

## 4. Test the Connection

```bash
npm test
```

This runs unit tests. To verify connectivity with your credentials:

```bash
npm run smoke
```

Expected output includes a successful authentication check and user information.

## 5. Start the Server

```bash
npm start
```

You should see:

```text
Screeps MCP Server running on stdio
```

Press `Ctrl+C` to stop.

## 6. Configure Claude Desktop

Find your config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the Screeps MCP server:

```json
{
  "mcpServers": {
    "screeps": {
      "command": "node",
      "args": ["/path/to/screeps-mcp/src/index.js"],
      "env": {
        "SCREEPS_TOKEN": "your_token_here",
        "SCREEPS_SERVER": "http://localhost:21025",
        "SCREEPS_BRANCH": "default"
      }
    }
  }
}
```

Use the absolute path to `src/index.js`. Completely restart Claude Desktop after saving.

## 7. Try It

Open Claude and try:

```text
Show me my Screeps user info
What's the current Screeps game time?
Troubleshoot my Screeps bot
```

## Troubleshooting

- **401 Unauthorized**: check your token, expiration, and permissions.
- **Cannot find module**: run `npm install` again.
- **Connection timeouts**: verify `SCREEPS_SERVER` and your network.
- **Console commands return no output**: commands execute on the next game tick. Run `get_console` afterward.

For Cursor-specific steps, see [cursor.md](cursor.md).

# Screeps API Reference and Limitations

This MCP server uses the official Screeps HTTP API plus a WebSocket connection for real-time console logs.

## Authentication

All requests require authentication using one of these methods:

### Token Authentication (Recommended)

```http
X-Token: your_auth_token
```

Set `SCREEPS_TOKEN` in your environment.

### Basic Authentication

```http
Authorization: Basic base64(email:password)
```

Set `SCREEPS_EMAIL` and `SCREEPS_PASSWORD` in your environment.

## Base URL

```
http://localhost:21025
```

The default targets a local private server. Set `SCREEPS_SERVER` to override it, for example `https://screeps.com` for the official server.

## Endpoints

| Endpoint | Method | Tool | Notes |
|----------|--------|------|-------|
| `/api/user/code` | POST | `upload_code` | Upload code modules |
| `/api/user/console` | GET | `get_console` | Returns 404; use WebSocket |
| `/api/user/console` | POST | `execute_command` | Requires active bot |
| `/api/user/memory` | GET | `get_memory` | Returns empty if bot never ran |
| `/api/user/memory` | POST | `set_memory` | Always works |
| `/api/game/room-terrain` | GET | `get_room_terrain` | Always works |
| `/api/game/room-status` | GET | `get_room_status` | Always works |
| `/api/game/time` | GET | `get_game_time` | Requires valid shard |
| `/api/auth/me` | GET | `get_user_info` | Always works |

## Composite Tools

These tools execute JavaScript in the Screeps console via `execute_command`.

### `analyze_performance`

```javascript
JSON.stringify({
  cpu: {
    bucket: Game.cpu.bucket,
    limit: Game.cpu.limit,
    tickLimit: Game.cpu.tickLimit,
    used: Game.cpu.getUsed(),
  },
  gcl: {
    level: Game.gcl.level,
    progress: Game.gcl.progress,
    progressTotal: Game.gcl.progressTotal,
  },
  rooms: Object.keys(Game.rooms).length,
  creeps: Object.keys(Game.creeps).length,
  time: Game.time,
});
```

### `get_room_objects`

```javascript
JSON.stringify({
  structures: Object.keys(Game.rooms['ROOM'].find(FIND_STRUCTURES) || []).length,
  creeps: Object.keys(Game.rooms['ROOM'].find(FIND_MY_CREEPS) || []).length,
  hostiles: Object.keys(Game.rooms['ROOM'].find(FIND_HOSTILE_CREEPS) || []).length,
  energy: Game.rooms['ROOM']?.energyAvailable,
  controller: {
    level: Game.rooms['ROOM']?.controller?.level,
    progress: Game.rooms['ROOM']?.controller?.progress,
    progressTotal: Game.rooms['ROOM']?.controller?.progressTotal,
  },
});
```

### `check_for_errors`

Scans `get_console` logs for entries containing `error`, `exception`, or `undefined` (case-insensitive).

## Known Limitations

- **Console logs**: the Screeps HTTP GET endpoint returns 404. The MCP uses a WebSocket connection for real-time logs when `SCREEPS_TOKEN` is provided.
- **Console commands**: require an active bot running in-game. Results appear in subsequent console logs.
- **Game time**: requires a valid shard such as `shard0`.
- **Code upload**: currently supports a single `main` module.

## Rate Limits

- Typical limit: 120 requests per minute.
- Token auth generally has higher limits than basic auth.
- Console commands are limited to 10 per tick.

## Security Best Practices

1. Use token authentication instead of email/password.
2. Rotate tokens periodically.
3. Use the least-privilege token scope the tool allows.
4. Never commit credentials. `.env` is already ignored by git.
5. Use HTTPS for private servers.

## Resources

- [Screeps Documentation](https://docs.screeps.com/)
- [Screeps API Reference](https://docs.screeps.com/api/)
- [Auth Tokens](https://docs.screeps.com/auth-tokens.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)

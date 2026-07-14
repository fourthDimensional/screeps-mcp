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
| `/api/user/code` | GET/POST | `get_code_modules`, `upload_modules` | Read/write a complete module manifest |
| `/api/user/set-active-branch` | POST | `activate_branch` | Policy-gated; no corresponding active-branch read tool |
| `/api/user/console` | GET | `get_console` | Returns 404; use WebSocket |
| `/api/user/console` | POST | `execute_command` | Requires active bot |
| `/api/user/memory` | GET | `get_memory` | Returns empty if bot never ran |
| `/api/user/memory` | POST | `set_memory` | Always works |
| `/api/game/room-terrain` | GET | `get_room_terrain` | Always works |
| `/api/game/room-status` | GET | `get_room_status` | Always works |
| `/api/game/time` | GET | `get_game_time` | Requires valid shard |
| `/api/auth/me` | GET | `get_user_info` | Always works |

## Harness tools

All tools return `{ ok, code, message, data }`; see [Tool Results](tool-results.md). `upload_modules` accepts a complete manifest with `entryModule`, `modules`, and an optional content hash. `deploy_and_verify` accepts that manifest, while `deploy_files_and_verify` builds it from a local JavaScript file or directory. Both persist a deployment record, read the target branch back to verify the module hash, capture a distinct-tick observation window, and never activate a branch implicitly.

`run_probe`, `get_empire_snapshot`, and `get_room_snapshot` wait for a correlated console result. A successful `POST /api/user/console` acknowledgement only proves that a command was issued; it is never treated as live game data.

| Tool group | Tools | Result data |
| --- | --- | --- |
| Policy and audit | `get_policy`, `get_audit_log` | Effective permissions and redacted append-only events. |
| Deployment records | `get_deployment`, `list_deployments`, `rollback_deployment` | Branch, shard, hashes, baseline, ticks, status, and verification. |
| Code lifecycle | `list_branches`, `list_code_modules`, `get_code_modules`, `validate_modules`, `validate_files`, `upload_modules`, `upload_files`, `activate_branch`, `deploy_and_verify`, `deploy_files_and_verify` | Complete manifests, validation errors, and remote payload under `rawServerData`. |
| Observation | `get_console`, `run_probe`, `get_empire_snapshot`, `get_room_snapshot` | Cursor records or tick-correlated structured snapshots with freshness. |
| Evidence | `get_telemetry`, `record_snapshot`, `get_metrics`, `compare_deployments`, `evaluate_health` | Optional telemetry, local samples, summary statistics, and a three-state verdict. |

`get_room_snapshot` accepts a `detail` selector. The `structures` detail returns each visible built structure (type, location, durability, and store where relevant), each visible construction site (structure type, location, and build progress), and complete per-type totals. Both item arrays are capped at 2,500 entries and report truncation separately; totals always cover the whole visible room.

`validate_files`, `upload_files`, and `deploy_files_and_verify` build a complete manifest from a JavaScript file or a directory tree. Directory files become module names relative to that directory (`roles/harvester.js` becomes `roles/harvester`); `main.js` is the default entry module. All file tools only read under `SCREEPS_SOURCE_ROOT` (the process working directory unless configured). A verified deployment records its source path, module count, readback hash evidence, and distinct observed ticks. `upload_files`, `upload_modules`, `deploy_files_and_verify`, `activate_branch`, `rollback_deployment`, raw `execute_command`, and `set_memory` are audited mutations. In production they require the matching value in `SCREEPS_APPROVED_OPERATIONS`. Console records cap reads at 200; HTTP responses cap at 1 MiB; idempotent reads retry once.

## Compatibility tools

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

This is now a compatibility alias for the tick-correlated `room_objects` probe. Room names are validated and serialized as data; they are never interpolated into console JavaScript.

### `check_for_errors`

Scans `get_console` logs for entries containing `error`, `exception`, or `undefined` (case-insensitive).

## Documentation search

These tools query the local SQLite FTS5 index built from the Screeps docs repo. The index must exist at `SCREEPS_DOCS_DB` (default `./data/screeps_docs.db`). Build or refresh it with `npm run build:docs-index`.

| Tool | Purpose |
| --- | --- |
| `screeps_search` | BM25-ranked search over guide articles, API methods/properties, and constants. |
| `screeps_read_section` | Read the full text of one section by the id returned from `screeps_search`. |
| `screeps_read_page` | Read the entire page containing a section, truncated to ~24k characters. |

All three tools are read-only.

## Known Limitations

- **Console logs**: the Screeps HTTP GET endpoint returns 404. The MCP uses a WebSocket connection for real-time logs when `SCREEPS_TOKEN` is provided.
- **Console commands**: require an active bot running in-game. Results appear in subsequent console logs.
- **Game time**: requires a valid shard such as `shard0`.
- **Branch read APIs and private-server WebSockets**: treated as capability-dependent; see [Compatibility](compatibility.md).
- **Telemetry**: optional and bot-provided; see [Telemetry Contract](telemetry-contract.md).

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

# Screeps MCP - Version History

## v1.1.0 - WebSocket Edition (2025-10-10)

### Added

#### Real-Time Console Monitoring
- ✅ WebSocket support via `screeps-api` library
- ✅ Real-time console log streaming
- ✅ Console buffer management (200 entries)
- ✅ Connection status monitoring
- ✅ Auto-reconnection handling

#### Enhanced Console Tools
- `get_console` now returns real-time logs via WebSocket
- Added `clearBuffer` option to get only fresh logs
- Shard support for all room-related queries
- Connection status in console responses

#### Bot Integration
- WebSocket initializes on MCP server startup
- Persistent connection for continuous monitoring
- Enables AI-driven iterative development
- No manual console checking needed

### Changed
- `get_console` now uses WebSocket (was HTTP 404)
- `get_room_terrain` now requires shard parameter
- `get_room_status` now requires shard parameter
- `get_game_time` now requires shard parameter

### Fixed
- Console logs now work (via WebSocket, not HTTP)
- Shard support added to prevent "invalid shard" errors
- Better error handling for connection failures

### Dependencies
- Added: `screeps-api` (^5.6.0 or latest)
- Kept: `@modelcontextprotocol/sdk` (^0.5.0)
- Kept: `axios` (^1.6.0)
- Kept: `dotenv` (^16.0.0)

---

## v1.0.0 - Initial Release (2025-10-10)

### Added
- Basic MCP server implementation
- 13 tools for Screeps interaction
- HTTP-only API (no WebSocket)
- Token and email/password authentication
- Code upload functionality
- Memory read/write
- Room terrain and status queries
- User account information
- Performance analysis tools
- Troubleshooting capabilities

### Documentation
- README.md - Full guide
- QUICK_START.md - 5-minute setup
- INSTALL.md - Complete installation
- API_REFERENCE.md - API documentation
- CHANGELOG.md - Version tracking

---

## Migration Guide: v1.0.0 → v1.1.0

### Installation
```bash
cd screeps-mcp
npm install  # Installs screeps-api automatically
```

### Configuration
No changes needed! Same `.env` file and Cursor config work.

### Reload
After `npm install`, reload Cursor:
- Press `Ctrl+Shift+P`
- Type: "Reload Window"
- WebSocket will connect automatically

### Verification
```
Show me the console logs
```

Look for:
```json
{
  "source": "websocket",
  "connectionStatus": "connected"
}
```

### Breaking Changes
None! v1.1.0 is fully backward compatible.

### New Capabilities
- Real-time console logs
- Live error detection
- Immediate bot feedback
- AI can iterate based on results

---

## Upcoming Features (Future Versions)

### v1.2.0 (Planned)
- Multi-module code upload
- WebSocket room subscriptions
- Live performance streaming
- Battle replay analysis

### v1.3.0 (Planned)
- Market API integration
- Memory segment support
- Power creep management
- Automated performance profiling

### v2.0.0 (Future)
- Full dashboard integration
- Visual room rendering
- Advanced bot analytics
- Multi-bot management

---

*Current Version: 1.1.0*  
*Status: Production Ready* ✅  
*WebSocket: Enabled* 🔌



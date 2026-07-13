#!/usr/bin/env node

/**
 * Screeps MCP Server
 *
 * Model Context Protocol server for interfacing with Screeps.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SCREEPS_TOKEN, SCREEPS_SERVER } from './config.js';
import { initWebSocket, setWebSocketInitialized } from './websocket/index.js';
import { createServer } from './server.js';

async function main() {
  if (SCREEPS_TOKEN) {
    try {
      console.error('Initializing WebSocket connection...');
      await initWebSocket(SCREEPS_TOKEN, SCREEPS_SERVER);
      setWebSocketInitialized(true);
      console.error('✅ WebSocket ready for real-time console monitoring');
    } catch (error) {
      console.error('⚠️  WebSocket initialization failed:', error.message);
      console.error('   HTTP-only mode: code upload and other features will still work');
      setWebSocketInitialized(false);
    }
  } else {
    console.error('⚠️  No SCREEPS_TOKEN provided - WebSocket disabled');
    console.error('   Console logs will not be available');
  }

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Screeps MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

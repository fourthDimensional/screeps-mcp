import { ScreepsAPI } from 'screeps-api';
import { clearBuffer, getBuffer, getLatestCursor, pushLogs, pushResults } from './buffer.js';

let api = null;
let connectionStatus = 'disconnected';

function parseServerUrl(server) {
  const serverUrl = new URL(server);
  const protocol = serverUrl.protocol.replace(':', '');
  const port = serverUrl.port ? Number(serverUrl.port) : protocol === 'https' ? 443 : 80;

  return {
    protocol,
    hostname: serverUrl.hostname,
    port,
    path: '/',
  };
}

export async function initWebSocket(token, server = 'http://localhost:21025') {
  if (api && connectionStatus === 'connected') {
    console.error('WebSocket already connected');
    return api;
  }

  try {
    const { protocol, hostname, port, path } = parseServerUrl(server);

    api = new ScreepsAPI({
      token,
      protocol,
      hostname,
      port,
      path,
    });

    console.error('Connecting to Screeps WebSocket...');
    await api.socket.connect();
    connectionStatus = 'connected';

    api.socket.subscribe('console', (event) => {
      try {
        const { messages } = event.data;
        if (messages) {
          pushLogs(messages.log);
          pushResults(messages.results);
        }
      } catch (error) {
        console.error('Error processing console message:', error);
      }
    });

    api.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectionStatus = 'error';
    });

    api.socket.on('close', () => {
      console.error('WebSocket connection closed');
      connectionStatus = 'disconnected';
    });

    console.error('✅ WebSocket connected to Screeps successfully');
    return api;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error.message);
    connectionStatus = 'error';
    throw error;
  }
}

export async function closeWebSocket() {
  if (api && api.socket) {
    try {
      await api.socket.disconnect();
      connectionStatus = 'disconnected';
      console.error('WebSocket disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket:', error);
    }
    api = null;
  }
}

export async function ensureConnection(token, server) {
  if (connectionStatus !== 'connected') {
    console.error('Reconnecting WebSocket...');
    await initWebSocket(token, server);
  }
  return connectionStatus === 'connected';
}

export function getConnectionStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    bufferSize: getBuffer().count,
  };
}

export { clearBuffer, getBuffer, getLatestCursor };

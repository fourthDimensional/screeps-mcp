import { ScreepsAPI } from 'screeps-api';
import { clearBuffer, getBuffer, getLatestCursor, pushLogs, pushResults } from './buffer.js';

let api = null;
let connectionStatus = 'disconnected';
let subscriptionStatus = 'unsubscribed';

function values(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function consoleEntriesFromEvent(event) {
  const data = event?.data || {};
  const messages = data.messages || {};
  return {
    logs: [...values(messages.log), ...values(messages.error), ...values(data.error)],
    results: values(messages.results),
  };
}

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
  if (api && connectionStatus === 'connected' && subscriptionStatus === 'subscribed') {
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
    await api.socket.subscribe('console', (event) => {
      try {
        const { logs, results } = consoleEntriesFromEvent(event);
        pushLogs(logs);
        pushResults(results);
      } catch (error) {
        console.error('Error processing console message:', error);
      }
    });
    connectionStatus = 'connected';
    subscriptionStatus = 'subscribed';

    api.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectionStatus = 'error';
      subscriptionStatus = 'error';
    });

    api.socket.on('close', () => {
      console.error('WebSocket connection closed');
      connectionStatus = 'disconnected';
      subscriptionStatus = 'unsubscribed';
    });

    console.error('✅ WebSocket connected to Screeps successfully');
    return api;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error.message);
    connectionStatus = 'error';
    subscriptionStatus = 'error';
    throw error;
  }
}

export async function closeWebSocket() {
  if (api && api.socket) {
    try {
      await api.socket.disconnect();
      connectionStatus = 'disconnected';
      subscriptionStatus = 'unsubscribed';
      console.error('WebSocket disconnected');
    } catch (error) {
      console.error('Error disconnecting WebSocket:', error);
    }
    api = null;
  }
}

export async function ensureConnection(token, server) {
  if (connectionStatus !== 'connected' || subscriptionStatus !== 'subscribed') {
    console.error('Reconnecting WebSocket...');
    await initWebSocket(token, server);
  }
  return connectionStatus === 'connected';
}

export function getConnectionStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    subscribed: subscriptionStatus === 'subscribed',
    subscriptionStatus,
    bufferSize: getBuffer().count,
  };
}

export { clearBuffer, getBuffer, getLatestCursor };

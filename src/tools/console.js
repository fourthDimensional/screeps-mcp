import { client } from '../client.js';
import { getBuffer, getConnectionStatus } from '../websocket/index.js';

let wsInitialized = false;

export function setWebSocketInitialized(value) {
  wsInitialized = value;
}

export function isWebSocketInitialized() {
  return wsInitialized;
}

export async function getConsole() {
  if (wsInitialized) {
    try {
      const buffer = getBuffer();
      const status = getConnectionStatus();

      return {
        logs: buffer.logs,
        results: buffer.results,
        count: buffer.count,
        error: null,
        available: true,
        source: 'websocket',
        connectionStatus: status.status,
        note: 'Real-time console logs via WebSocket',
      };
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  }

  try {
    const response = await client.get('/api/user/console');

    return {
      logs: response.data.log || response.data.logs || [],
      results: response.data.results || [],
      error: response.data.error || null,
      available: true,
      source: 'http',
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return {
        logs: [],
        results: [],
        error: 'Console logs not available. WebSocket not connected.',
        available: false,
        note: 'WebSocket connection needed for console logs. Check server startup logs.',
      };
    }
    throw error;
  }
}

export async function clearConsoleBuffer() {
  const { clearBuffer } = await import('../websocket/index.js');
  return clearBuffer();
}

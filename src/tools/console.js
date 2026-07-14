import { transport } from '../transport/screeps-transport.js';
import { getBuffer, getConnectionStatus, getLatestCursor } from '../websocket/index.js';

let wsInitialized = false;

export function setWebSocketInitialized(value) {
  wsInitialized = value;
}

export function isWebSocketInitialized() {
  return wsInitialized;
}

export function consoleCursorForState({ initialized, connected, cursor }) {
  return initialized && connected ? cursor : null;
}

export function getConsoleCursor() {
  return consoleCursorForState({
    initialized: wsInitialized,
    connected: getConnectionStatus().connected,
    cursor: getLatestCursor(),
  });
}

export async function getConsole({ afterCursor = 0, limit = 100, levels } = {}) {
  const connectionStatus = getConnectionStatus();
  if (wsInitialized && connectionStatus.connected) {
    try {
      const buffer = getBuffer({ afterCursor, limit, levels });

      return {
        logs: buffer.logs,
        results: buffer.results,
        records: buffer.records,
        nextCursor: buffer.nextCursor,
        count: buffer.count,
        error: null,
        available: true,
        source: 'websocket',
        connectionStatus: connectionStatus.status,
        note: 'Real-time console logs via WebSocket',
      };
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  }

  try {
    const response = await transport.get('/api/user/console');

    return {
      logs: (response.data.log || response.data.logs || []).slice(-limit),
      results: (response.data.results || []).slice(-limit),
      records: [],
      nextCursor: afterCursor,
      error: response.data.error || null,
      available: true,
      source: 'http',
    };
  } catch (error) {
    if (error.code === 'feature_unavailable') {
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

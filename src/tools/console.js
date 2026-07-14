import { transport } from '../transport/screeps-transport.js';
import { getBuffer, getConnectionStatus, getLatestCursor } from '../websocket/index.js';
import { deploymentStore } from '../deployments.js';
import { HarnessError } from '../core/result.js';

let wsInitialized = false;

export function setWebSocketInitialized(value) {
  wsInitialized = value;
}

export function isWebSocketInitialized() {
  return wsInitialized;
}

export function consoleCursorForState({ initialized, connected, subscribed = true, cursor }) {
  return initialized && connected && subscribed ? cursor : null;
}

export function getConsoleCursor() {
  return consoleCursorForState({
    initialized: wsInitialized,
    connected: getConnectionStatus().connected,
    subscribed: getConnectionStatus().subscribed,
    cursor: getLatestCursor(),
  });
}

export async function getConsole({ afterCursor = 0, limit = 100, levels, deploymentId } = {}) {
  let deployment;
  let beforeCursor;
  if (deploymentId) {
    deployment = await deploymentStore.get(deploymentId);
    if (!deployment) throw new HarnessError('not_found', 'Deployment record was not found.', { deploymentId });
    afterCursor = deployment.consoleStart?.cursor ?? afterCursor;
    beforeCursor = deployment.consoleEnd?.cursor;
  }
  const connectionStatus = getConnectionStatus();
  if (wsInitialized && connectionStatus.connected && connectionStatus.subscribed) {
    try {
      const buffer = getBuffer({ afterCursor, beforeCursor, limit, levels });
      const records = deployment
        ? buffer.records.map((record) => ({ ...record, deploymentId: deployment.id }))
        : buffer.records;

      return {
        logs: buffer.logs,
        results: buffer.results,
        records,
        nextCursor: buffer.nextCursor,
        count: buffer.count,
        error: null,
        available: true,
        source: 'websocket',
        connectionStatus: connectionStatus.status,
        ...(deployment
          ? { deployment: { id: deployment.id, tickRange: { start: deployment.requestedTick, end: deployment.completionTick }, cursorRange: { after: afterCursor, through: beforeCursor ?? null } } }
          : {}),
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
